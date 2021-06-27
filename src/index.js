const { forEach } = require('p-iteration');

const TaskBus = require('async-task-queue-runner');
const puppeteer = require('puppeteer');
const got = require('got');
const { HttpsProxyAgent } = require('hpagent');
const cheerio = require('cheerio');
const delay = require('delay');

const Links = require('./links');
const Pptr = require('./pptr');

module.exports = async function run(sites, options) {
	const taskBus = new TaskBus([], options.maxConcurrency || 1, options.retryLimit || 0);
	const decorators = options.decorators;
	const proxy = options.proxy;

	const context = { taskBus, decorators, proxy, output: {} };

	sites.forEach(site => {
		taskBus.add(task.bind(null, site, context));
	});

	await taskBus.run();

	return context.output;

	async function task(baseUrl, context) {
		const { decorators = {} } = context;

		const pptr = new Pptr(options.puppeteer);

		const links = new Links(baseUrl);
		links.register(baseUrl);

		await pptr.start();

		for (;;) {
			const nextUrl = links.getFirstUncheckedUrl();

			if (nextUrl === null) {
				break;
			}

			try {
				if (decorators.beforeEach) {
					await decorators.beforeEach.call(decorators, context, nextUrl, baseUrl);
				}

				await parseHandlerPuppeteer(nextUrl, links, pptr, context);
				// await parseHandler(nextUrl, links, context);

				throw 'test';

				if (decorators.afterEach) {
					await decorators.afterEach.call(decorators, context, nextUrl, baseUrl);
				}
			} catch(error) {
				console.error(error);

				throw error;
			}

			const checkedCount = links.getCheckedLinks().length;
			const allCount = links.getInternalLinks().length;

			console.log(`${baseUrl}: ${checkedCount}/${allCount}`);
		}

		context.output[baseUrl] = links.getInternalLinks();

		await pptr.stop();
	}

	async function parseHandler(url, links, context) {
		const response = await makeRequest(url, context.proxy);
		const $ = cheerio.load(response.body);

		const linkObjects = $('a');
		const hrefs = [];

		linkObjects.each((index, element) => {
			const href = links.addPrefixIfNeed($(element).attr('href'));

			hrefs.push(href);
		});

		links.setChecked(url);
		links.collect(hrefs);
	}

	async function parseHandlerPuppeteer(url, links, pptr) {
		const hrefs = await pptr.hrefs(url);

		links.setChecked(url);
		links.collect(hrefs);
	}

	function makeRequest(url, proxy) {
		const options = {};

		if (proxy) {
			options.agent = {
				https: new HttpsProxyAgent({
					keepAlive: true,
					keepAliveMsecs: 1000,
					maxSockets: 256,
					maxFreeSockets: 256,
					scheduling: 'lifo',
					proxy: 'https://localhost:8080'
				})
			};
		}

		console.log(url);

		return got(url, options);
	}
};