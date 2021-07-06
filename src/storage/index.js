const fse = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const rimraf = require('rimraf');

module.exports = class Storage {
	constructor(baseUrl, options = {}) {
		this.baseUrl = baseUrl;
		this.options = options;

		this.fileName = this.getFileName();

		this.map = this.options.fileStore ? this.readFromFile() : {};
	}

	getLinks() {
		return Object.values(this.map);
	}

	getInternalLinks() {
		return this.getLinks().filter(item => item.internal === true);
	}

	getCheckedLinks() {
		return this.getLinks().filter(item => item.internal === true && item.checked === true);
	}

	getUncheckedLinks() {
		return this.getLinks().filter(item => item.internal === true && item.checked === false);
	}

	getFirstUncheckedUrl() {
		const links = this.getUncheckedLinks();

		return links && links.length ? links[0].url : null;
	}

	collect(urls) {
		urls.forEach(url => {
			if (this.map[url]) {
				return;
			}

			this.register(url);
		});

		if (this.options.fileStore) {
			this.saveToFile();
		}

		return this.map;
	}

	register(url) {
		this.map[url] = {
			url,
			checked: false,
			internal: this.isInternal(url)
		};
	}

	setChecked(url) {
		this.map[url].checked = true;
	}

	isInternal(url) {
		return url.indexOf(this.baseUrl) === 0;
	}

	getFileName() {
		const { hostname } = new URL(this.baseUrl);
		
		const rootDir = this.options.rootDir || __dirname;
		const fileName = path.resolve(rootDir, `${hostname}.json`);

		return fileName;
	}

	readFromFile() {
		if (!fse.existsSync(this.fileName)) {
			return {};
		}
		
		return fse.readJSONSync(this.fileName, this.map);
	}

	saveToFile() {
		if (!fse.existsSync(this.fileName)) {
			fse.ensureDir(path.dirname(this.fileName));
		}

		fse.writeJSONSync(this.fileName, this.map);
	}

	cleanFile() {
		if (fse.existsSync(this.fileName)) {
			rimraf.sync(this.fileName);
		}
	}
};