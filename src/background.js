import addPermissionToggle from 'webext-permission-toggle';
import browser from 'webextension-polyfill';

// Default settings
const defaultSettings = {
  useCollapsibleGifs: false,
};

function initContextMenu() {
  browser.storage.sync.get(defaultSettings, (settings) => {
    browser.contextMenus.create({
      id: 'toggle-collapsible-gifs',
      title: 'Use collapsible GIFs',
      type: 'checkbox',
      checked: settings.useCollapsibleGifs,
      contexts: ['action', 'browser_action'],
    });
  });
}

browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'toggle-collapsible-gifs') {
    browser.storage.sync.set({ useCollapsibleGifs: info.checked });
  }
});

// Add permission toggle
addPermissionToggle();

initContextMenu();

browser.runtime.onInstalled.addListener(initContextMenu);
