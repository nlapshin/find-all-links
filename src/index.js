const { Cluster } = require('puppeteer-cluster');
const { forEach } = require('p-iteration');

const Links = require('./links');

module.exports = async function run(sites = [], options = {}) {
	if (!options.concurrency) {
		options.concurrency = Cluster.CONCURRENCY_CONTEXT;
	}

	const cluster = await Cluster.launch(options);
	const siteMap = {};

	await cluster.task(task);

	await forEach(sites, async (site) => {
		siteMap[site] = await cluster.execute(site);
	});

	await cluster.idle();
	await cluster.close();

	return siteMap;
};

async function task({ page, data: baseUrl })  {
	const links = new Links(baseUrl);

	links.register(baseUrl);

	for (;;) {
		const nextUrl = links.getFirstUncheckedUrl();

		if (nextUrl === null) {
			break;
		}

		try {
			await findAllLinks(page, nextUrl, links);
		} catch(error) {
			console.error(error);
		}

		const checkedCount = links.getCheckedLinks().length;
		const allCount = links.getInternalLinks().length;

		console.log(`${baseUrl}: ${checkedCount}/${allCount}`);
	}

	return links.getInternalLinks();
}

async function findAllLinks(page, url, links) {
	await page.goto(url, { waitUntil: 'domcontentloaded' });

	const hrefs = await page.$$eval('a', as => as.map(a => a.href));

	links.setChecked(url);
	links.collect(hrefs);
}