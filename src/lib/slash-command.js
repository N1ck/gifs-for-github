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
  const gap = 8;
  const viewportHeight = globalThis.innerHeight;
  const viewportWidth = globalThis.innerWidth;
  const spaceAbove = Math.max(0, rect.top - gap * 2);
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap * 2);
  const availableHeight = Math.max(spaceAbove, spaceBelow);
  const height = Math.min(
    360,
    Math.max(0, viewportHeight - gap * 2),
    availableHeight >= 160 ? availableHeight : 360,
  );
  const width = Math.max(0, Math.min(rect.width, 480, viewportWidth - gap * 2));
  const top = spaceAbove >= height ? rect.top - height - gap : rect.bottom + gap;

  popupElement.style.left = `${Math.max(gap, Math.min(rect.left, viewportWidth - width - gap))}px`;
  popupElement.style.width = `${width}px`;
  popupElement.style.height = `${height}px`;
  popupElement.style.top = `${Math.max(gap, Math.min(top, viewportHeight - height - gap))}px`;
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

function renderGifs(container, gifs) {
  const MAX_WIDTH = 145;

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
      if (!event.isComposing && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
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
  popupElement.style.display = 'flex';

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

function isWithinSession(target) {
  return activeElement?.contains(target) || popup?.contains(target);
}

function handleFocus(event) {
  if (isVisible() && !isWithinSession(event.target)) {
    hide();
  }
}

function handleKeydown(event) {
  if (!isVisible() || event.isComposing) {
    return;
  }

  if (!isWithinSession(event.target)) {
    hide();
    return;
  }

  if (event.key === 'Escape') {
    const editor = activeElement;
    const restoreFocus = popup.contains(event.target);
    hide();
    if (restoreFocus) {
      editor.focus({ preventScroll: true });
    }

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return;
  }

  const items = [...popup.querySelectorAll('.ghg-gif-selection')];
  if (items.length === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const currentIndex = items.indexOf(document.activeElement);
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(currentIndex + direction, items.length - 1));
  items[nextIndex].focus({ preventScroll: true });
  items[nextIndex].scrollIntoView({ block: 'nearest' });
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
  document.addEventListener('focusin', handleFocus, true);
  document.addEventListener('mousedown', handleClickOutside, true);
}
