import GifProvider from './gif-provider.js';

const BASE_URL = 'https://api.giphy.com/v1/gifs';
const PER_PAGE = 50;
const GITHUB_MAX_SIZE = 5 * 1024 * 1024;

export default class Giphy extends GifProvider {
  constructor(apiKey) {
    super();
    this._apiKey = apiKey;
  }

  async search(q, page = 1) {
    const offset = (page - 1) * PER_PAGE;
    const url = `${BASE_URL}/search?api_key=${this._apiKey}&q=${encodeURIComponent(q)}&limit=${PER_PAGE}&offset=${offset}&rating=g`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data;
  }

  async getTrending(page = 1) {
    const offset = (page - 1) * PER_PAGE;
    const url = `${BASE_URL}/trending?api_key=${this._apiKey}&limit=${PER_PAGE}&offset=${offset}&rating=g`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data;
  }

  getGifUrls(gif) {
    const { original, downsized, fixed_width: fixedWidth } = gif.images;
    const originalSize = Number.parseInt(original.size, 10);
    const fullSizeUrl = originalSize < GITHUB_MAX_SIZE ? original.url : downsized.url;

    return {
      previewUrl: fixedWidth.url,
      previewWidth: Number.parseInt(fixedWidth.width, 10),
      previewHeight: Number.parseInt(fixedWidth.height, 10),
      fullSizeUrl,
    };
  }
}
