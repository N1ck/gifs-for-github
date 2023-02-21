export default class Tenor {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('[Tenor] API Token required')
    }
    this.apiToken = apiToken
  }

  async search(q, offset = 0) {
    const params = new URLSearchParams({
      q: q,
      key: this.apiToken,
      client_key: "my_test_app",
      limit: 50,
      pos: offset,
    })
    const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`)
    const decodedResponse = await response.json()

    return decodedResponse.results.map(Tenor.convertToGiphyObj)
  }

  async getTrending(offset = 0) {
    const params = new URLSearchParams({
      key: this.apiToken,
      client_key: "my_test_app",
      limit: 50,
    })

    if (offset > 0) {
      params.pos = offset
    }
    
    const response = await fetch(`https://tenor.googleapis.com/v2/featured?${params.toString()}`)
    const decodedResponse = await response.json()

    return decodedResponse.results.map(Tenor.convertToGiphyObj)
  }

  static convertToGiphyObj(item) {
    return {
      images: {
        original: {
          size: item.media_formats.gif.size,
          url: item.media_formats.gif.url,
        },
        downsized_medium: {
          size: item.media_formats.mediumgif.size,
          url: item.media_formats.mediumgif.url,
        },
        fixed_width: {
          size: item.media_formats.tinygif.size,
          url: item.media_formats.tinygif.url,
          height: item.media_formats.tinygif.dims[1],
          width: item.media_formats.tinygif.dims[0],
        },
        fixed_width_downsampled: {
          size: item.media_formats.tinygif.size,
          url: item.media_formats.tinygif.url,
        },
      }
    }
  }
}
