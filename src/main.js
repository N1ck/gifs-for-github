import debounce from 'debounce-fn';
import Masonry from 'masonry-layout';
import onetime from 'onetime';
import select from 'select-dom';
import { insert } from 'text-field-edit';
import GiphyToolbarItem from './components/giphy-toolbar-item.js';
import LoadingIndicator from './components/loading-indicator.js';
import Giphy from './lib/giphy.js';
import observe from './lib/selector-observer.js';
import { getSetting } from './lib/settings.js';
import './style.css';

// Global declaration for the webpack-injected DEBUG constant
/* global DEBUG */

// Create a new Giphy Client
const giphyClient = new Giphy('Mpy5mv1k9JRY2rt7YBME2eFRGNs7EGvQ');

// Debug mode is controlled by the DEBUG environment variable
// Set with DEBUG=true npm run build

function debugLog(...messages) {
  if (typeof DEBUG !== 'undefined' && DEBUG) {
    console.log('🎨 [GIFs for GitHub]:', ...messages);
  }
}

/**
 * Responds to the GIPHY modal being opened or closed.
 */
async function watchGiphyModals(element) {
  if (!element) {
    return;
  }

  const parent = element.closest('.ghg-has-giphy-field');
  if (!parent) {
    return;
  }

  const resultsContainer = select('.ghg-giphy-results', parent);
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
      const gifs = await giphyClient.getTrending();

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
            itemSelector: '.ghg-giphy-results div',
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
 * Adds the GIPHY button to markdown toolbars.
 */
function addToolbarButton(toolbar) {
  if (!toolbar) {
    return;
  }

  // Skip if we've already added a button to this toolbar
  if (toolbar.querySelector('.ghg-trigger') || toolbar.classList.contains('ghg-has-giphy-button')) {
    return;
  }

  // Find the toolbar group to add our button to
  const isNewToolbar = toolbar.getAttribute('aria-label') === 'Formatting tools';
  let toolbarGroup;

  if (isNewToolbar) {
    // New GitHub style (issues page)
    // Find the last div that contains buttons (before the divider)
    const groups = [...toolbar.children].filter(element => element.tagName === 'DIV');
    if (groups.length >= 2) {
      toolbarGroup = groups.at(-2); // Second to last group, before the divider
    }
  } else {
    // Old GitHub style
    toolbarGroup = select('.ActionBar-item-container, .toolbar-group', toolbar) ||
      select.all('.toolbar-commenting > :not([class*="--hidden"]):not(button):not(.ml-auto)', toolbar).at(-1);
  }

  if (!toolbarGroup) {
    return;
  }

  // Find the parent form and text area
  let form = toolbar.closest('form, .js-previewable-comment-form, [role="form"]');
  let textArea;

  // If we haven't found a form, try finding the closest container with a textarea
  if (form === null) {
    let current = toolbar;
    while (current && current !== document.body) {
      const nearestTextArea = current.querySelector('textarea, [role="textbox"], .js-comment-field');
      if (nearestTextArea) {
        form = current;
        textArea = nearestTextArea;
        break;
      }
      current = current.parentElement;
    }
  } else {
    // If we found a form, look for the textarea within it
    textArea = form.querySelector([
      '.js-comment-field',
      '[name="issue[body]"]',
      '[name="pull_request[body]"]',
      '[name="comment[body]"]',
      '[name="discussion[body]"]',
      'textarea',
      '[role="textbox"]',
    ].join(','));
  }

  if (!form || !textArea) {
    return;
  }

  // Skip if we've already added the button to this form
  if (form.classList.contains('ghg-has-giphy-field')) {
    return;
  }

  // Create the GIF button
  const button = GiphyToolbarItem.cloneNode(true);

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
      watchGiphyModals(button);
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

  // Add the button at the appropriate position
  if (isNewToolbar) {
    // For new GitHub style, add before the last button (usually slash commands)
    const lastButton = toolbarGroup.lastElementChild;
    if (lastButton) {
      lastButton.before(button);
    } else {
      toolbarGroup.append(button);
    }
  } else {
    // For old GitHub style, add at the end
    toolbarGroup.append(button);
  }

  // Mark the toolbar and form as processed
  toolbar.classList.add('ghg-has-giphy-button');
  form.classList.add('ghg-has-giphy-field');

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
  resetGiphyModals();
}

/**
 * Initialize the extension by adding buttons to existing toolbars
 * and watching for new ones.
 */
function init() {
  debugLog('Initializing GIFs for GitHub...');

  // Add buttons to existing toolbars
  // Use a selector that matches both new and old GitHub styles
  const toolbarSelector = '[aria-label="Formatting tools"]:not(.ghg-has-giphy-button), markdown-toolbar:not(.ghg-has-giphy-button)';
  const existingToolbars = select.all(toolbarSelector);
  debugLog('Found existing toolbars:', existingToolbars.length);

  if (existingToolbars.length === 0) {
    debugLog('No toolbars found matching selector:', toolbarSelector);
  }

  for (const toolbar of existingToolbars) {
    addToolbarButton(toolbar);
  }

  // Watch for new toolbars
  observe(toolbarSelector, (toolbar) => {
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
 * Resets GIPHY modals by clearing the search input field, any
 * results, and all data attributes.
 */
function resetGiphyModals() {
  for (const ghgModal of select.all('.ghg-modal')) {
    const resultContainer = select('.ghg-giphy-results', ghgModal);
    const searchInput = select('.ghg-search-input', ghgModal);
    searchInput.value = '';
    resultContainer.innerHTML = '';
    resultContainer.dataset.offset = 0;
    resultContainer.dataset.searchQuery = '';
    resultContainer.dataset.hasResults = false;
  }
}

/**
 * Perform a search of the GIPHY API and append the results
 * to the modal.
 */
async function performSearch(event) {
  event.preventDefault();
  const searchQuery = event.target.value;
  const parent = event.target.closest('.ghg-has-giphy-field');

  const resultsContainer = select('.ghg-giphy-results', parent);

  if (!resultsContainer) {
    return;
  }

  resultsContainer.dataset.offset = 0;
  resultsContainer.dataset.searchQuery = searchQuery;

  // Show a loading indicator
  resultsContainer.append(<div>{LoadingIndicator}</div>);

  // If there is no search query, get the trending gifs
  const gifs = await (searchQuery === '' ?
      giphyClient.getTrending() :
      giphyClient.search(searchQuery));

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

  // GitHub has a 10MB image upload limit,
  // however, when embedding an image URL
  // in a GitHub comment box, GitHub will proxy
  // the image and if the image is above 5MB it fails.
  const GITHUB_MAX_SIZE = 5 * 1024 * 1024;
  let fullSizeUrl;
  const downsampledUrl = gif.images.fixed_width_downsampled.url;

  if (gif.images.original.size < GITHUB_MAX_SIZE) {
    fullSizeUrl = gif.images.original.url;
  } else if (gif.images.downsized_medium.size < GITHUB_MAX_SIZE) {
    fullSizeUrl = gif.images.downsized_medium.url;
  } else if (gif.images.fixed_width.size < GITHUB_MAX_SIZE) {
    fullSizeUrl = gif.images.fixed_width.url;
  } else {
    fullSizeUrl = downsampledUrl;
  }

  const height = Math.floor(
    (gif.images.fixed_width.height * MAX_GIF_WIDTH) /
    gif.images.fixed_width.width,
  );

  // Generate a random pastel colour to use as an image placeholder
  const hsl = `hsl(${360 * Math.random()}, ${25 + 70 * Math.random()}%,${
    85 + 10 * Math.random()
  }%)`;

  return (
    <div style={{ width: `${MAX_GIF_WIDTH}px` }}>
      <img
        src={downsampledUrl}
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
        itemSelector: '.ghg-giphy-results div',
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
 * Closes the GIPHY modal and inserts the selected GIF in the textarea.
 */
async function selectGif(event) {
  const form = event.target.closest('.ghg-has-giphy-field');
  const trigger = select('.ghg-trigger', form);
  const gifUrl = event.target.dataset.fullSizeUrl;

  // Use the same comprehensive set of selectors we use when finding the textarea
  const textArea = form.querySelector([
    '.js-comment-field',
    '[name="issue[body]"]',
    '[name="pull_request[body]"]',
    '[name="comment[body]"]',
    '[name="discussion[body]"]',
    'textarea',
    '[role="textbox"]',
  ].join(','));

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
        const offset = resultsContainer.dataset.offset ?
          Number.parseInt(resultsContainer.dataset.offset, 10) + 50 :
          50;
        const searchQuery = resultsContainer.dataset.searchQuery;

        resultsContainer.dataset.offset = offset;

        const gifs = await (searchQuery ?
            giphyClient.search(searchQuery, offset) :
            giphyClient.getTrending(offset));

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
  resetGiphyModals();
});
