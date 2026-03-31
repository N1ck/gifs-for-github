/**
 * Base class for GIF providers. All providers must implement search(), getTrending(), and getGifUrls().
 */
export default class GifProvider {
  async search(_q, _page = 1) {
    throw new Error('Not implemented');
  }

  async getTrending(_page = 1) {
    throw new Error('Not implemented');
  }

  // Given a raw GIF object from the provider's API, returns normalised URLs for display.
  // { previewUrl: string, previewWidth: number, previewHeight: number, fullSizeUrl: string }
  getGifUrls(_gif) {
    throw new Error('Not implemented');
  }
}
