import browser from 'webextension-polyfill';

const form = document.querySelector('#options-form');
const input = document.querySelector('#giphy-api-key');
const clearButton = document.querySelector('#clear-btn');
const status = document.querySelector('#status');
const slashCheckbox = document.querySelector('#enable-slash-command');
const widthForm = document.querySelector('#width-form');
const widthInput = document.querySelector('#gif-width');
const clearWidthButton = document.querySelector('#clear-width-btn');
const widthStatus = document.querySelector('#width-status');

function showStatus(message, element = status) {
  element.textContent = message;
  setTimeout(() => {
    element.textContent = '';
  }, 2000);
}

async function loadSettings() {
  const { giphyApiKey, enableSlashCommand, gifWidth } = await browser.storage.sync.get({
    giphyApiKey: '',
    enableSlashCommand: false,
    gifWidth: '',
  });
  input.value = giphyApiKey || '';
  slashCheckbox.checked = enableSlashCommand;
  widthInput.value = gifWidth || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = input.value.trim();
  await browser.storage.sync.set({ giphyApiKey: key });
  showStatus(key ? 'Saved. Using GIPHY.' : 'Saved. Using KLIPY.');
});

clearButton.addEventListener('click', async () => {
  input.value = '';
  await browser.storage.sync.set({ giphyApiKey: '' });
  showStatus('Cleared. Using KLIPY.');
});

slashCheckbox.addEventListener('change', async () => {
  await browser.storage.sync.set({ enableSlashCommand: slashCheckbox.checked });
  showStatus(slashCheckbox.checked ? 'Slash command enabled.' : 'Slash command disabled.');
});

async function saveGifWidth(width) {
  await browser.storage.sync.set({ gifWidth: width });
  showStatus(width ? `GIF width set to ${width}px.` : 'GIF width reset to original size.', widthStatus);
}

// Only allow digits in the width field
widthInput.addEventListener('input', () => {
  const digitsOnly = widthInput.value.replaceAll(/\D/g, '');
  if (widthInput.value !== digitsOnly) {
    widthInput.value = digitsOnly;
  }
});

widthForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const width = widthInput.value.replaceAll(/\D/g, '').replace(/^0+/, '');
  widthInput.value = width;
  await saveGifWidth(width);
});

clearWidthButton.addEventListener('click', async () => {
  widthInput.value = '';
  await saveGifWidth('');
});

loadSettings();
