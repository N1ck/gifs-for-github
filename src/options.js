import browser from 'webextension-polyfill';

const form = document.querySelector('#options-form');
const input = document.querySelector('#giphy-api-key');
const clearButton = document.querySelector('#clear-btn');
const status = document.querySelector('#status');
const slashCheckbox = document.querySelector('#enable-slash-command');

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    status.textContent = '';
  }, 2000);
}

async function loadSettings() {
  const { giphyApiKey, enableSlashCommand } = await browser.storage.sync.get({
    giphyApiKey: '',
    enableSlashCommand: false,
  });
  input.value = giphyApiKey || '';
  slashCheckbox.checked = enableSlashCommand;
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

loadSettings();
