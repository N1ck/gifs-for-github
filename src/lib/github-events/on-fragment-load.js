import delegate from 'delegate';
import mem from 'mem';
import observe from '../selector-observer.js';

// This lets you call `onDiffFileLoad` multiple times with the same callback but only ever a `load` listener is registered
const getDeduplicatedHandler = mem(callback => (event) => {
	event.delegateTarget.addEventListener('load', callback);
});

function createFragmentLoadListener(fragmentSelector, callback) {
	// `loadstart` is fired when the fragment is still attached so event delegation works.
	// `load` is fired after it's detached, so `delegate` would never listen to it.
	// This is why we listen to a global `loadstart` and then add a specific `load` listener on the element, which is fired even when the element is detached.
	return delegate(
		document,
		fragmentSelector,
		'loadstart',
		getDeduplicatedHandler(callback),
		true,
	);
}

const diffFileFragmentsSelector = [
	'include-fragment.diff-progressive-loader', // Incremental file loader on scroll
	'include-fragment.js-diff-entry-loader', // File diff loader on clicking "Load Diff"
	'#files_bucket:not(.pull-request-tab-content) include-fragment', // Diff on compare pages
].join(',');

export function onDiffFileLoad(callback) {
	return createFragmentLoadListener(diffFileFragmentsSelector, callback);
}

export function onCommentEdit(callback) {
	return createFragmentLoadListener(
		'.js-comment-edit-form-deferred-include-fragment',
		callback,
	);
}

export default function onFragmentLoad(_callback) {
	// The load event doesn't bubble, so it's not caught by the event delegation.
	// It's also not triggered if the element was already loaded.
	observe('img[data-full-size-url]', (_img) => {
		// ... existing code ...
	});
}
