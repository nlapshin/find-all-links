module.exports = class Links {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;

		this.map = {};
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
};