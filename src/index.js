const { Cluster } = require('puppeteer-cluster');
const { forEach } = require('p-iteration');

const Links = require('./links');

module.exports = async function run(sites = [], options = {}, decorators = {}) {
	if (!options.concurrency) {
		options.concurrency = Cluster.CONCURRENCY_CONTEXT;
	}

	const cluster = await Cluster.launch(options);
	const siteMap = {};

	await cluster.task(task);

	await forEach(sites, async (site) => {
		siteMap[site] = await cluster.execute({ url: site, decorators });
	});

	await cluster.idle();
	await cluster.close();

	return siteMap;
};

async function task({ page, data })  {
	const { url: baseUrl, decorators } = data;

	if (decorators.skip) {
		const skip = await decorators.skip.call(decorators, page, baseUrl);
		
		if (skip === true) {
			return Promise.resolve([]);
		}
	}

	if (decorators.before) {
		await decorators.before.call(decorators, page, baseUrl);
	}

	const links = new Links(baseUrl);

	links.register(baseUrl);

	for (;;) {
		const nextUrl = links.getFirstUncheckedUrl();

		if (nextUrl === null) {
			break;
		}

		try {
			if (decorators.skipBeforeEach) {
				const skip = await decorators.skipBeforeEach.call(decorators, page, baseUrl);
				
				if (skip === true) {
					links.setChecked(nextUrl);

					return Promise.resolve([]);
				}
			}

			if (decorators.beforeEach) {
				await decorators.beforeEach.call(decorators, page, nextUrl, baseUrl);
			}

			await findAllLinks(page, nextUrl, links);

			if (decorators.afterEach) {
				await decorators.afterEach.call(decorators, page, nextUrl, baseUrl);
			}
		} catch(error) {
			console.error(error);
		}

		const checkedCount = links.getCheckedLinks().length;
		const allCount = links.getInternalLinks().length;

		console.log(`${baseUrl}: ${checkedCount}/${allCount}`);
	}

	if (decorators.after) {
		await decorators.after.call(decorators, page, baseUrl);
	}

	return links.getInternalLinks();
}

async function findAllLinks(page, url, links) {
	await page.goto(url, { waitUntil: 'domcontentloaded' });

	const hrefs = await page.$$eval('a', as => as.map(a => a.href));

	links.setChecked(url);
	links.collect(hrefs);
}