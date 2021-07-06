const { Cluster } = require('puppeteer-cluster');
const { forEach } = require('p-iteration');

const Storage = require('./storage');

let errorCount = 0;

module.exports = async function run(sites = [], options = {}, decorators = {}) {
	if (!options.concurrency) {
		options.concurrency = Cluster.CONCURRENCY_CONTEXT;
	}

	const cluster = await Cluster.launch(options);
	const siteMap = {};

	await cluster.task(task);

	await forEach(sites, async (site) => {
		siteMap[site] = await cluster.execute({ url: site, decorators, storage: options.storage });
	});

	await cluster.idle();
	await cluster.close();

	return siteMap;
};

async function task({ page, data })  {
	const { url: baseUrl, decorators, storage: storageOptions = {} } = data;
	const storage = new Storage(baseUrl, storageOptions);

	if (decorators.skip) {
		const skip = await decorators.skip.call(decorators, page, baseUrl);
		
		if (skip === true) {
			return Promise.resolve([]);
		}
	}

	if (decorators.before) {
		await decorators.before.call(decorators, page, baseUrl);
	}

	storage.register(baseUrl);

	for (;;) {
		const nextUrl = storage.getFirstUncheckedUrl();

		if (nextUrl === null) {
			break;
		}

		try {
			if (decorators.skipBeforeEach) {
				const skip = await decorators.skipBeforeEach.call(decorators, page, nextUrl, baseUrl);
				
				if (skip === true) {
					storage.setChecked(nextUrl);

					continue;
				}
			}

			if (decorators.beforeEach) {
				await decorators.beforeEach.call(decorators, page, nextUrl, baseUrl);
			}

			await findAllLinks(page, nextUrl, storage);

			if (decorators.afterEach) {
				await decorators.afterEach.call(decorators, page, nextUrl, baseUrl);
			}
		} catch(error) {
			console.error(error);

			if (errorCount >= 10) {
				throw error;
			}

			errorCount++;
		}

		logCount(baseUrl, storage);
	}

	if (decorators.after) {
		await decorators.after.call(decorators, page, baseUrl);
	}

	if (this.options.fileStore) {
		storage.cleanFile();
	}

	return storage.getInternalLinks();
}

async function findAllLinks(page, url, links) {
	await page.goto(url, { waitUntil: 'domcontentloaded' });

	const hrefs = await page.$$eval('a', as => as.map(a => a.href));

	links.setChecked(url);
	links.collect(hrefs);
}

function logCount(baseUrl, storage) {
	const checkedCount = storage.getCheckedLinks().length;
	const allCount = storage.getInternalLinks().length;

	console.log(`${baseUrl}: ${checkedCount}/${allCount}`);
}