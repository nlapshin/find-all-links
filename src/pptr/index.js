const puppeteer = require('puppeteer');

module.exports = class Pptr {
	constructor(options = {}) {
		this.options = { headless: false };

		this.browser = null;
		this.page = null;
	}

	async start() {
		this.browser = await puppeteer.launch(this.options);
	}

	stop() {
		return this.browser.stop();
	}

	async hrefs(url) {
		const page = await this.browser.newPage();

		try {
			await page.goto(url, { waitUntil: 'domcontentloaded' });

			const hrefs = await page.$$eval('a', as => as.map(a => a.href));

			return hrefs;
		} finally {
			await page.close();
		}
	}
};