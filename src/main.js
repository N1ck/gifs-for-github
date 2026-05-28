import debounce from 'debounce-fn';
import Masonry from 'masonry-layout';
import onetime from 'onetime';
import select from 'select-dom';
import { insert } from 'text-field-edit';
import GifToolbarItem from './components/gif-toolbar-item.js';
import LoadingIndicator from './components/loading-indicator.js';
import { InvalidApiKeyError } from './lib/gif-provider.js';
import Giphy from './lib/giphy.js';
import Klipy from './lib/klipy.js';
import observe from './lib/selector-observer.js';
import { getSetting } from './lib/settings.js';
import './style.css';

// Global declaration for the webpack-injected DEBUG constant
/* global DEBUG */

let gifProvider = new Klipy();

/** Containers that wrap a markdown comment field. */
const COMMENT_FORM_SELECTORS = [
  'form',
  '.js-previewable-comment-form',
  '[role="form"]',
  '[data-testid="comment-composer"]',
  '[data-testid="markdown-editor-comment-composer"]',
  '[class*="MarkdownEditor-module__inputWrapper"]',
  '[class*="ReviewMenuButton-module__CommentBoxContainer"]',
].join(', ');

/** Textareas and React comment fields across old and new GitHub UIs. */
const TEXTAREA_SELECTORS = [
  '.js-comment-field',
  'textarea[aria-labelledby="comment-composer-heading"]',
  '[name="issue[body]"]',
  '[name="pull_request[body]"]',
  '[name="comment[body]"]',
  '[name="discussion[body]"]',
  'textarea',
  '[role="textbox"]',
].join(', ');

/** Outer markdown editor wrapper when the matched node is the inner Formatting tools bar. */
const MARKDOWN_TOOLBAR_SELECTOR = [
  '[class^="Toolbar-module__toolbar"]',
  '[class*=" Toolbar-module__toolbar"]',
].join(', ');

const TOOLBAR_SELECTOR = `:is(
  [data-target="action-bar.itemContainer"],
  [aria-label="Formatting tools"],
  markdown-toolbar
):not(.ghg-has-gif-button)`;

function isCommentTextarea(element) {
  return Boolean(element.closest(
    `${COMMENT_FORM_SELECTORS}, [class*="MarkdownEditor-module"], [class*="ReviewMenuButton-module"], #review-changes-modal`,
  ));
}

function findCommentContainer(toolbar) {
  let current = toolbar.parentElement;
  while (current && current !== document.body) {
    const field = current.querySelector(TEXTAREA_SELECTORS);
    if (field && isCommentTextarea(field)) {
      return current;
    }
    current = current.parentElement;
  }
}

/** Append beside the ActionBar on the outer Toolbar-module wrapper, not inside role=toolbar. */
function getToolbarAppendTarget(toolbar) {
  if (toolbar.getAttribute('aria-label') === 'Formatting tools') {
    return toolbar.closest(MARKDOWN_TOOLBAR_SELECTOR) ?? toolbar;
  }

  return toolbar;
}

async function initProvider() {
  const key = await getSetting('giphyApiKey');
  if (key) {
    gifProvider = new Giphy(key);
  }
}

// Debug mode is controlled by the DEBUG environment variable
// Set with DEBUG=true npm run build

function debugLog(...messages) {
  if (typeof DEBUG !== 'undefined' && DEBUG) {
    console.log('🎨 [GIFs for GitHub]:', ...messages);
  }
}

/**
 * Responds to the GIF modal being opened or closed.
 */
async function watchGifModals(element) {
  if (!element) {
    return;
  }

  const parent = element.closest('.ghg-has-gif-field');
  if (!parent) {
    return;
  }

  const resultsContainer = select('.ghg-gif-results', parent);
  const searchInput = select('.ghg-search-input', parent);

  if (!resultsContainer || !searchInput) {
    return;
  }

  const initInfiniteScroll = onetime(
    bindInfiniteScroll.bind(this, resultsContainer),
  );

  // Bind the scroll event to the results container
  initInfiniteScroll();

  // If the modal has been opened and there is no search term,
  // and no search results, load the trending gifs
  if (
    searchInput.value === '' &&
    resultsContainer.dataset.hasResults === 'false'
  ) {
    // Set the loading state
    resultsContainer.innerHTML = '';
    resultsContainer.append(LoadingIndicator.cloneNode(true));

    try {
      // Fetch the trending gifs
      resultsContainer.dataset.page = 1;
      const gifs = await gifProvider.getTrending();

      // Clear the loading indicator
      resultsContainer.innerHTML = '';

      // Add the gifs to the results container
      if (gifs && gifs.length > 0) {
        appendResults(resultsContainer, gifs);
      } else {
        showNoResultsFound(resultsContainer);
      }
    } catch {
      resultsContainer.innerHTML = '<div class="ghg-error">Error loading GIFs. Please try again.</div>';
    }
  } else {
    // Initialize masonry layout for existing results
    setTimeout(
      () => {
        try {
          // Store masonry instance to satisfy linter (no side effects)
          const masonryLayout = new Masonry(resultsContainer, {
            itemSelector: '.ghg-gif-results div',
            columnWidth: 145,
            gutter: 10,
            transitionDuration: '0.2s',
          });
          // Keep reference to prevent garbage collection
          resultsContainer.masonryLayout = masonryLayout;
        } catch {
          // Silently fail if masonry initialization fails
          // This is not critical to the functionality
        }
      },
      10,
    );
  }
}

/**
 * Adds the GIF button to markdown toolbars.
 */
function addToolbarButton(toolbar) {
  if (!toolbar) {
    return;
  }

  const appendTarget = getToolbarAppendTarget(toolbar);

  // Skip if we've already added a button to this toolbar (or its outer wrapper)
  if (appendTarget.querySelector('.ghg-trigger') || appendTarget.classList.contains('ghg-has-gif-button')) {
    toolbar.classList.add('ghg-has-gif-button');
    return;
  }

  // Legacy item containers nested inside the modern ActionBar are not separate toolbars
  if (toolbar.matches('[data-target="action-bar.itemContainer"]') &&
    toolbar.closest('[aria-label="Formatting tools"]')) {
    return;
  }

  // Check if the toolbar is inside a table row (e.g., in diff views)
  const tableRow = toolbar.closest('tr');
  if (tableRow) {
    debugLog('Found toolbar inside table row, adding class');
    tableRow.classList.add('ghg-has-toolbar');
  }

  // Find the parent form and text area
  let form = toolbar.closest(COMMENT_FORM_SELECTORS);
  let textArea;

  // If we haven't found a form, try finding the closest container with a textarea
  if (form === null) {
    const container = findCommentContainer(toolbar);
    if (container) {
      form = container;
      textArea = container.querySelector(TEXTAREA_SELECTORS);
    }
  } else {
    textArea = form.querySelector(TEXTAREA_SELECTORS);
  }

  if (!form || !textArea || !isCommentTextarea(textArea)) {
    return;
  }

  // Skip if we've already added the button to this form
  if (form.classList.contains('ghg-has-gif-field')) {
    return;
  }

  // Create the GIF button
  const button = GifToolbarItem.cloneNode(true);

  // Update the search placeholder to reflect the active provider
  const providerSearchInput = button.querySelector('.ghg-search-input');
  if (providerSearchInput) {
    const isKlipy = !(gifProvider instanceof Giphy);
    providerSearchInput.placeholder = isKlipy ? 'Search KLIPY' : 'Search for a GIF…';
    providerSearchInput.setAttribute('aria-label', isKlipy ? 'Search KLIPY' : 'Search for a GIF');
  }

  // Fix space key handling in the input field
  button.addEventListener(
    'keydown',
    (event) => {
      if (event.code === 'Space') {
        event.stopPropagation();
      }
    },
    { capture: true },
  );

  // Add direct event listeners right after creating the button
  const summaryElement = button.querySelector('summary');
  if (summaryElement) {
    summaryElement.addEventListener('click', () => {
      watchGifModals(button);
    });
  }

  const searchInput = button.querySelector('.ghg-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', debounce((event) => {
      performSearch(event);
    }, { wait: 400 }));

    searchInput.addEventListener('keypress', (event) => {
      preventFormSubmitOnEnter(event);
    });
  }

  button.setAttribute('data-targets', 'action-bar.items');
  button.classList.add('my-auto', 'flex-shrink-0');
  appendTarget.append(button);

  // Mark the toolbar and form as processed
  appendTarget.classList.add('ghg-has-gif-button');
  if (toolbar !== appendTarget) {
    toolbar.classList.add('ghg-has-gif-button');
  }
  form.classList.add('ghg-has-gif-field');

  // Handle review changes modal positioning
  const reviewChangesModal = toolbar.closest('#review-changes-modal');
  const reviewChangesList = toolbar.closest('#review-changes-modal .SelectMenu-list');

  if (reviewChangesModal) {
    reviewChangesModal.classList.add('ghg-in-review-changes-modal');

    // Adjust modal width to accommodate our button
    const trigger = select('.ghg-trigger', form);
    const triggerWidth = (trigger?.offsetWidth || 32) + 8;
    const currentWidth = reviewChangesModal.style.width;

    if (currentWidth?.includes('px')) {
      const widthValue = Number.parseInt(currentWidth.match(/\d+/)[0], 10);
      reviewChangesModal.style.width = currentWidth.replace(
        `${widthValue}px`,
        `${widthValue + triggerWidth}px`,
      );
    }
  }

  if (reviewChangesList) {
    reviewChangesList.classList.add('ghg-in-review-changes-list');
  }

  // Reset any existing GIF search state
  resetGifModals();
}

/**
 * Initialize the extension by adding buttons to existing toolbars
 * and watching for new ones.
 */
async function init() {
  await initProvider();
  debugLog('Initializing GIFs for GitHub...');

  const existingToolbars = select.all(TOOLBAR_SELECTOR);
  debugLog('Found existing toolbars:', existingToolbars.length);

  if (existingToolbars.length === 0) {
    debugLog('No toolbars found matching selector:', TOOLBAR_SELECTOR);
  }

  for (const toolbar of existingToolbars) {
    addToolbarButton(toolbar);
  }

  observe(TOOLBAR_SELECTOR, (toolbar) => {
    debugLog('New toolbar found:', toolbar);
    addToolbarButton(toolbar);
  });
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Resets GIF modals by clearing the search input field, any
 * results, and all data attributes.
 */
function resetGifModals() {
  for (const ghgModal of select.all('.ghg-modal')) {
    const resultContainer = select('.ghg-gif-results', ghgModal);
    const searchInput = select('.ghg-search-input', ghgModal);
    searchInput.value = '';
    resultContainer.innerHTML = '';
    resultContainer.dataset.page = 1;
    resultContainer.dataset.searchQuery = '';
    resultContainer.dataset.hasResults = false;
  }
}

/**
 * Perform a search and append the results
 * to the modal.
 */
async function performSearch(event) {
  event.preventDefault();
  const searchQuery = event.target.value;
  const parent = event.target.closest('.ghg-has-gif-field');

  const resultsContainer = select('.ghg-gif-results', parent);

  if (!resultsContainer) {
    return;
  }

  resultsContainer.dataset.page = 1;
  resultsContainer.dataset.searchQuery = searchQuery;

  // Show a loading indicator
  resultsContainer.append(<div>{LoadingIndicator}</div>);

  // If there is no search query, get the trending gifs
  let gifs;
  try {
    gifs = await (searchQuery === '' ?
        gifProvider.getTrending() :
        gifProvider.search(searchQuery));
  } catch (error) {
    resultsContainer.innerHTML = '';
    if (error instanceof InvalidApiKeyError) {
      showError(resultsContainer, 'Your GIPHY API key appears to be invalid. Check the extension settings.');
    } else {
      showError(resultsContainer, 'Something went wrong. Please try again.');
    }

    return;
  }

  // Clear any previous results
  resultsContainer.innerHTML = '';

  // Add the GIFs to the results container
  if (gifs && gifs.length > 0) {
    appendResults(resultsContainer, gifs);
  } else {
    showNoResultsFound(resultsContainer);
  }
}

/**
 * Returns a GIF in the format required to display in the modal search results.
 */
function getFormattedGif(gif) {
  const MAX_GIF_WIDTH = 145;
  const { previewUrl, previewWidth, previewHeight, fullSizeUrl } = gifProvider.getGifUrls(gif);
  const height = Math.floor((previewHeight * MAX_GIF_WIDTH) / previewWidth);

  // Generate a random pastel colour to use as an image placeholder
  const hsl = `hsl(${360 * Math.random()}, ${25 + 70 * Math.random()}%,${
    85 + 10 * Math.random()
  }%)`;

  return (
    <div style={{ width: `${MAX_GIF_WIDTH}px` }}>
      <img
        src={previewUrl}
        height={height}
        style={{ 'background-color': hsl }}
        data-full-size-url={fullSizeUrl}
        class="ghg-gif-selection"
      />
    </div>
  );
}

function showNoResultsFound(resultsContainer) {
  resultsContainer.append(
    <div class="ghg-no-results-found">No GIFs found.</div>,
  );
}

function showError(resultsContainer, message) {
  resultsContainer.append(
    <div class="ghg-no-results-found">{message}</div>,
  );
}

/**
 * Appends a collection of GIFs to the provided result container.
 */
function appendResults(resultsContainer, gifs) {
  resultsContainer.dataset.hasResults = true;

  const gifsToAdd = [];

  for (const gif of gifs) {
    const img = getFormattedGif(gif);
    gifsToAdd.push(img);
    resultsContainer.append(img);

    // Add direct event listener to the GIF element
    const gifSelection = img.querySelector('.ghg-gif-selection');
    if (gifSelection) {
      gifSelection.addEventListener('click', (event) => {
        selectGif(event);
      });
    }
  }

  setTimeout(() => {
    // eslint-disable-next-line no-new
    new Masonry(
      resultsContainer,
      {
        itemSelector: '.ghg-gif-results div',
        columnWidth: 145,
        gutter: 10,
        transitionDuration: '0.2s',
      },
      10,
    );
  });
}

/**
 * Insert text in the targeted textarea and focus the content
 */
function insertText(textarea, content) {
  if (!textarea) {
    console.error('No textarea provided to insertText');
    return;
  }

  textarea.focus();
  insert(textarea, content);
}

/**
 * Invoked when a GIF from the result set has been clicked.
 *
 * Closes the GIF modal and inserts the selected GIF in the textarea.
 */
async function selectGif(event) {
  const form = event.target.closest('.ghg-has-gif-field');
  const trigger = select('.ghg-trigger', form);
  const gifUrl = event.target.dataset.fullSizeUrl;
  debugLog(`Inserting GIF: ${gifUrl}`);

  const textArea = form.querySelector(TEXTAREA_SELECTORS);

  if (!textArea) {
    console.error('Could not find textarea in form:', form);
    return;
  }

  // Close the modal
  trigger.removeAttribute('open');

  // Get the search query if available
  const searchInput = select('.ghg-search-input', form);
  const searchQuery = searchInput ? searchInput.value : '';

  // Check if collapsible GIFs setting is enabled
  const useCollapsibleGifs = await getSetting('useCollapsibleGifs');

  if (useCollapsibleGifs) {
    // Create collapsible template with the search query as the summary text
    const summaryText = searchQuery || 'GIF';
    const template = `<details open>
  <summary><i>${summaryText}</i></summary>
  <img src="${gifUrl}"/>
</details>`;
    insertText(textArea, template);
  } else {
    // Insert plain GIF as before
    insertText(textArea, `<img src="${gifUrl}"/>`);
  }
}

/**
 * Prevents the outer form from submitting when enter is pressed in the GIF search
 * input.
 */
function preventFormSubmitOnEnter(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    return false;
  }
}

function bindInfiniteScroll(resultsContainer) {
  if (!resultsContainer) {
    debugLog('No results container provided to bindInfiniteScroll');
    return;
  }

  try {
    resultsContainer.addEventListener('scroll', handleInfiniteScroll);
  } catch (error) {
    console.error('Error binding infinite scroll:', error);
  }
}

function handleInfiniteScroll(event) {
  if (!event || !event.target) {
    debugLog('Invalid scroll event:', event);
    return;
  }

  let searchTimer;
  const resultsContainer = event.target;
  const currentScrollPosition = resultsContainer.scrollTop + 395;
  const INFINITE_SCROLL_PX_OFFSET = 100;

  if (
    currentScrollPosition + INFINITE_SCROLL_PX_OFFSET >
    Number.parseInt(resultsContainer.style.height || '0', 10)
  ) {
    // Start the infinite scroll after the last scroll event
    clearTimeout(searchTimer);

    searchTimer = setTimeout(async () => {
      try {
        const page = Number.parseInt(resultsContainer.dataset.page || '1', 10) + 1;
        const searchQuery = resultsContainer.dataset.searchQuery;

        resultsContainer.dataset.page = page;

        const gifs = await (searchQuery ?
            gifProvider.search(searchQuery, page) :
            gifProvider.getTrending(page));

        if (gifs && gifs.length > 0) {
          appendResults(resultsContainer, gifs);
        }
      } catch (error) {
        console.error('Error loading more GIFs:', error);
      }
    }, 250);
  }
}

// Listen for page navigation
onetime(() => {
  debugLog('Page navigation detected');
  init();
});
// Handle page transitions
document.addEventListener('turbo:render', () => {
  resetGifModals();
});
