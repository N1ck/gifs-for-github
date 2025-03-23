import { GiphyFetch } from '@giphy/js-fetch-api';

export default class Giphy {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('[GIPHY] API Token required');
    }

    this.client = new GiphyFetch(apiToken);
  }

  async search(q, offset = 0) {
    const { data: results } = await this.client.search(q, { offset, limit: 50 });
    return results;
  }

  async getTrending(offset = 0) {
    const { data: results } = await this.client.trending({ offset, limit: 50 });
    return results;
  }
}
