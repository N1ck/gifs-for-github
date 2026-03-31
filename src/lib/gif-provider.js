/**
 * Base class for GIF providers. All providers must implement search() and getTrending().
 */
export default class GifProvider {
  async search(_q, _page = 1) {
    throw new Error('Not implemented');
  }

  async getTrending(_page = 1) {
    throw new Error('Not implemented');
  }
}
