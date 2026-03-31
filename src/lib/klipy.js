import browser from 'webextension-polyfill';
import GifProvider from './gif-provider.js';

/* global KLIPY_API_KEY */
const BASE_URL = 'https://api.klipy.com/api/v1';
const API_KEY = KLIPY_API_KEY;

export default class Klipy extends GifProvider {
  constructor() {
    super();
    this._customerId = undefined;
  }

  async _getCustomerId() {
    if (this._customerId) {
      return this._customerId;
    }

    const { klipyCustomerId } = await browser.storage.sync.get('klipyCustomerId');
    if (klipyCustomerId) {
      this._customerId = klipyCustomerId;
    } else {
      this._customerId = crypto.randomUUID();
      await browser.storage.sync.set({ klipyCustomerId: this._customerId });
    }

    return this._customerId;
  }

  async search(q, page = 1) {
    const customerId = await this._getCustomerId();
    const url = `${BASE_URL}/${API_KEY}/gifs/search?q=${encodeURIComponent(q)}&page=${page}&per_page=50&customer_id=${customerId}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data.data;
  }

  async getTrending(page = 1) {
    const customerId = await this._getCustomerId();
    const url = `${BASE_URL}/${API_KEY}/gifs/trending?page=${page}&per_page=50&customer_id=${customerId}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data.data;
  }
}
