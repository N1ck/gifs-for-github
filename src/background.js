import addPermissionToggle from 'webext-permission-toggle';
import browser from 'webextension-polyfill';

// Default settings
const defaultSettings = {
  useCollapsibleGifs: false,
};

async function getSettings() {
  return browser.storage.sync.get(defaultSettings);
}

// Initialize context menu
async function initContextMenu() {
  const settings = await getSettings();

  const manifest = browser.runtime.getManifest();
  const contexts = manifest.manifest_version === 2 ?
      ['browser_action'] :
      ['action'];

  // Create context menu
  browser.contextMenus.create({
    id: 'toggle-collapsible-gifs',
    title: 'Use collapsible GIFs',
    type: 'checkbox',
    checked: settings.useCollapsibleGifs,
    contexts,
  });
}

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'toggle-collapsible-gifs') {
    await browser.storage.sync.set({ useCollapsibleGifs: info.checked });
  }
});

addPermissionToggle();

initContextMenu();

// Also initialize on extension install/update
browser.runtime.onInstalled.addListener(initContextMenu);
