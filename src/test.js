const { Cluster } = require('puppeteer-cluster');

const findAllLinks = require('./');

(async () => {
	const sites = [
		'https://www.google.ru',
		'https://www.ya.ru'
	];

	const options = {
		concurrency: Cluster.CONCURRENCY_CONTEXT,
		maxConcurrency: 2,
		timeout: 180 * 1000,
		retryLimit: 10,
		retryDelay: 30 * 1000,
		monitor: true,
		storage: {
			fileStore: true
		}
	};

	await findAllLinks(sites, options);
})();