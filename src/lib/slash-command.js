import debounce from 'debounce-fn';
import Masonry from 'masonry-layout';
import { insert } from 'text-field-edit';
import LoadingIndicator from '../components/loading-indicator.js';
import { getSetting } from './settings.js';

const SLASH_GIF_RE = /(?:^|\n)(\/gif(?:[ \t]([^\n]*))?)$/;

const COMMENT_CONTAINERS = [
  'form',
  '.js-previewable-comment-form',
  '[role="form"]',
  '[data-testid="comment-composer"]',
  '[data-testid="markdown-editor-comment-composer"]',
  '[class*="MarkdownEditor-module"]',
  '[class*="ReviewMenuButton-module"]',
].join(', ');

let popup;
let activeElement;
let activeMatch;
let provider;
let masonryInstance;
let loadGeneration = 0;
let focusedGifIndex = -1;

function isCommentField(element) {
  return Boolean(element.closest(COMMENT_CONTAINERS));
}

function createPopup() {
  const element = (
    <div class="ghg-slash-popup" tabindex="-1">
      <div class="ghg-slash-popup-header">
        <span class="ghg-slash-popup-title">Trending GIFs</span>
      </div>
      <div class="ghg-slash-popup-results" />
    </div>
  );
  document.body.append(element);
  return element;
}

function getPopup() {
  if (!popup) {
    popup = createPopup();
  }

  return popup;
}

function positionPopup(element) {
  const popupElement = getPopup();
  const rect = element.getBoundingClientRect();
  const POPUP_HEIGHT = 360;
  const viewportHeight = globalThis.innerHeight;

  popupElement.style.left = `${rect.left}px`;
  popupElement.style.width = `${Math.min(rect.width, 480)}px`;

  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  if (spaceAbove > POPUP_HEIGHT + 16) {
    popupElement.style.top = 'auto';
    popupElement.style.bottom =
      `${viewportHeight - rect.top + 8}px`;
  } else if (spaceBelow > POPUP_HEIGHT + 16) {
    popupElement.style.bottom = 'auto';
    popupElement.style.top = `${rect.bottom + 8}px`;
  } else {
    // Neither side has full room — use whichever has more space, constrain height
    const maxHeight = Math.max(spaceAbove, spaceBelow) - 16;
    popupElement.style.maxHeight = `${maxHeight}px`;
    if (spaceAbove >= spaceBelow) {
      popupElement.style.top = 'auto';
      popupElement.style.bottom =
        `${viewportHeight - rect.top + 8}px`;
    } else {
      popupElement.style.bottom = 'auto';
      popupElement.style.top = `${rect.bottom + 8}px`;
    }
  }
}

function destroyMasonry() {
  if (masonryInstance) {
    try {
      masonryInstance.destroy();
    } catch {
      // non-critical
    }

    masonryInstance = undefined;
  }
}

async function loadGifs(query, generation) {
  const container = getPopup().querySelector('.ghg-slash-popup-results');
  destroyMasonry();
  container.innerHTML = '';
  container.append(LoadingIndicator.cloneNode(true));

  try {
    const gifs = await (query ?
        provider.search(query) :
        provider.getTrending());

    if (generation !== loadGeneration) {
      return;
    }

    container.innerHTML = '';

    if (gifs && gifs.length > 0) {
      renderGifs(container, gifs);
    } else {
      container.append(
        <div class="ghg-no-results-found">No GIFs found.</div>,
      );
    }
  } catch {
    if (generation !== loadGeneration) {
      return;
    }

    container.innerHTML =
      '<div class="ghg-no-results-found">Error loading GIFs.</div>';
  }
}

function updateGifFocus() {
  const container = getPopup().querySelector('.ghg-slash-popup-results');
  const items = container.querySelectorAll('.ghg-gif-selection');
  for (const [index, item] of items.entries()) {
    if (index === focusedGifIndex) {
      item.classList.add('ghg-gif-focused');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('ghg-gif-focused');
    }
  }
}

function renderGifs(container, gifs) {
  const MAX_WIDTH = 145;
  focusedGifIndex = -1;

  for (const gif of gifs) {
    const { previewUrl, previewWidth, previewHeight, fullSizeUrl } =
      provider.getGifUrls(gif);
    const height = Math.floor((previewHeight * MAX_WIDTH) / previewWidth);
    const hsl = `hsl(${360 * Math.random()}, ${
      25 + 70 * Math.random()
    }%, ${85 + 10 * Math.random()}%)`;

    const element = (
      <div style={{ width: `${MAX_WIDTH}px` }}>
        <img
          src={previewUrl}
          height={height}
          style={{ 'background-color': hsl }}
          class="ghg-gif-selection"
          data-full-size-url={fullSizeUrl}
          tabindex="0"
          role="button"
          aria-label="Select GIF"
        />
      </div>
    );

    const img = element.querySelector('img');
    img.addEventListener('click', () => {
      handleGifSelect(fullSizeUrl);
    });

    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleGifSelect(fullSizeUrl);
      }
    });

    container.append(element);
  }

  setTimeout(() => {
    try {
      destroyMasonry();
      masonryInstance = new Masonry(container, {
        itemSelector: '.ghg-slash-popup-results div',
        columnWidth: MAX_WIDTH,
        gutter: 10,
        transitionDuration: '0.2s',
      });
    } catch {
      // non-critical
    }
  }, 10);
}

async function handleGifSelect(gifUrl) {
  const capturedElement = activeElement;
  const capturedMatch = activeMatch;

  if (!capturedElement || !capturedMatch) {
    return;
  }

  const { start, end, query } = capturedMatch;
  const useCollapsible = await getSetting('useCollapsibleGifs');

  if (activeElement !== capturedElement || activeMatch !== capturedMatch) {
    return;
  }

  let replacement;
  if (useCollapsible) {
    const summary = query || 'GIF';
    replacement = `<details open>\n  <summary><i>${summary}</i></summary>\n  <img src="${gifUrl}"/>\n</details>`;
  } else {
    replacement = `<img src="${gifUrl}"/>`;
  }

  capturedElement.focus();

  if (capturedElement.tagName === 'TEXTAREA') {
    capturedElement.setSelectionRange(start, end);
    insert(capturedElement, replacement);
  } else if (capturedMatch.node) {
    const sel = globalThis.getSelection();
    const range = document.createRange();
    range.setStart(capturedMatch.node, start);
    range.setEnd(capturedMatch.node, end);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, replacement);
  }

  hide();
}

const debouncedLoadGifs = debounce(
  (query) => {
    const title = getPopup().querySelector('.ghg-slash-popup-title');
    title.textContent = query ? `Search: ${query}` : 'Trending GIFs';
    loadGeneration++;
    loadGifs(query, loadGeneration);
  },
  { wait: 400 },
);

function show(element, query) {
  const popupElement = getPopup();
  positionPopup(element);
  popupElement.style.display = 'block';
  popupElement.style.maxHeight = '';

  const title = popupElement.querySelector('.ghg-slash-popup-title');
  title.textContent = query ? `Search: ${query}` : 'Trending GIFs';

  loadGeneration++;
  loadGifs(query, loadGeneration);
  addScrollListeners();
}

function hide() {
  debouncedLoadGifs.cancel();
  loadGeneration++;

  if (popup) {
    popup.style.display = 'none';
  }

  destroyMasonry();
  removeScrollListeners();
  activeElement = undefined;
  activeMatch = undefined;
  focusedGifIndex = -1;
}

function isVisible() {
  return popup && popup.style.display !== 'none';
}

function handleScrollReposition() {
  if (!isVisible() || !activeElement) {
    return;
  }

  const rect = activeElement.getBoundingClientRect();

  if (rect.bottom < 0 || rect.top > globalThis.innerHeight) {
    hide();
    return;
  }

  positionPopup(activeElement);
}

function addScrollListeners() {
  globalThis.addEventListener('scroll', handleScrollReposition, true);
  globalThis.addEventListener('resize', handleScrollReposition);
}

function removeScrollListeners() {
  globalThis.removeEventListener('scroll', handleScrollReposition, true);
  globalThis.removeEventListener('resize', handleScrollReposition);
}

function detectSlashGif(element) {
  if (element.tagName === 'TEXTAREA') {
    const value = element.value;
    const cursor = element.selectionStart;
    const textUpToCursor = value.slice(0, cursor);
    const match = textUpToCursor.match(SLASH_GIF_RE);
    if (!match) {
      return;
    }

    const fullMatch = match[1];
    const query = (match[2] || '').trim();
    return { start: cursor - fullMatch.length, end: cursor, query };
  }

  // contenteditable
  const sel = globalThis.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) {
    return;
  }

  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const text = node.textContent;
  const offset = range.startOffset;
  const match = text.slice(0, offset).match(SLASH_GIF_RE);
  if (!match) {
    return;
  }

  const fullMatch = match[1];
  const query = (match[2] || '').trim();
  return { start: offset - fullMatch.length, end: offset, query, node };
}

function handleInput(event) {
  const element = event.target;

  const isTextarea = element.tagName === 'TEXTAREA';
  const isEditable =
    element.getAttribute('role') === 'textbox' || element.isContentEditable;

  if (!isTextarea && !isEditable) {
    return;
  }

  if (!isCommentField(element)) {
    return;
  }

  const match = detectSlashGif(element);

  if (match) {
    if (activeElement !== element) {
      debouncedLoadGifs.cancel();
      activeElement = element;
      activeMatch = match;
      show(element, match.query);
    } else if (!activeMatch || activeMatch.query !== match.query) {
      activeMatch = match;
      debouncedLoadGifs(match.query);
    } else {
      activeMatch = match;
    }
  } else if (activeElement === element) {
    hide();
  }
}

function handleKeydown(event) {
  if (!isVisible()) {
    return;
  }

  if (event.key === 'Escape') {
    hide();
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const container = getPopup().querySelector('.ghg-slash-popup-results');
  const items = container.querySelectorAll('.ghg-gif-selection');
  if (items.length === 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    event.stopPropagation();
    focusedGifIndex = Math.min(focusedGifIndex + 1, items.length - 1);
    updateGifFocus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    event.stopPropagation();
    focusedGifIndex = Math.max(focusedGifIndex - 1, 0);
    updateGifFocus();
  } else if (event.key === 'Enter' && focusedGifIndex >= 0) {
    event.preventDefault();
    event.stopPropagation();
    const gifUrl = items[focusedGifIndex].dataset.fullSizeUrl;
    handleGifSelect(gifUrl);
  }
}

function handleClickOutside(event) {
  if (isVisible() && popup && !popup.contains(event.target)) {
    hide();
  }
}

export function initSlashCommand(gifProvider) {
  provider = gifProvider;
  document.addEventListener('input', handleInput, true);
  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('mousedown', handleClickOutside, true);
}
