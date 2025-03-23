// https://github.com/sindresorhus/refined-github/blob/master/source/libs/simplified-element-observer.js
export default function observe(element, listener, options) {
	options = {...options, childList: true};

	if (typeof element === 'string') {
		element = document.querySelector(element);
	}

	if (!element) {
		return;
	}

	// Run on updates
	const observer = new MutationObserver(listener);
	observer.observe(element, options);

	// Run the first time
	listener.call(observer, []);

	return observer;
}
