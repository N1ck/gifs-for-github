/**
 * Handles extension settings and configuration
 */
import browser from 'webextension-polyfill';

// Default settings
const defaultSettings = {
  useCollapsibleGifs: false,
};

/**
 * Gets all extension settings
 * @returns {Promise<object>} The settings object
 */
export async function getSettings() {
  return browser.storage.sync.get(defaultSettings);
}

/**
 * Gets a specific setting value
 * @param {string} key - The setting key
 * @returns {Promise<any>} The setting value
 */
export async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}
