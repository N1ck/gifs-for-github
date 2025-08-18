import addPermissionToggle from 'webext-permission-toggle';
import browser from 'webextension-polyfill';

// Default settings
const defaultSettings = {
  useCollapsibleGifs: false,
};

// Check if we have storage permission
async function hasStoragePermission() {
  const permissions = await browser.permissions.getAll();
  return permissions.permissions && permissions.permissions.includes('storage');
}

// Request storage permission
async function requestStoragePermission() {
  return browser.permissions.request({
    permissions: ['storage'],
  });
}

// Get settings safely (fallback to defaults if no permission)
async function getSettings() {
  console.log('has permission?', await hasStoragePermission());
  if (await hasStoragePermission()) {
    return browser.storage.sync.get(defaultSettings);
  }
  return defaultSettings;
}

// Save settings safely (request permission first if needed)
async function saveSettings(settings) {
  if (!await hasStoragePermission()) {
    const granted = await requestStoragePermission();
    if (!granted) {
      console.log('Storage permission not granted');
      return false;
    }
  }

  await browser.storage.sync.set(settings);
  return true;
}

// Initialize context menu
async function initContextMenu() {
  const settings = await getSettings();

  // Use same approach as webext-permission-toggle for browser compatibility
  const manifest = browser.runtime.getManifest();
  const contexts = manifest.manifest_version === 2 ?
      ['browser_action'] :
      ['action'];

  // Create context menu with appropriate context for the browser
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
    const saved = await saveSettings({ useCollapsibleGifs: info.checked });

    // If permission was denied, reset the checkbox
    if (!saved) {
      browser.contextMenus.update('toggle-collapsible-gifs', {
        checked: !info.checked,
      });
    }
  }
});

addPermissionToggle();

setTimeout(initContextMenu, 50);

// Also initialize on extension install/update
browser.runtime.onInstalled.addListener(initContextMenu);
