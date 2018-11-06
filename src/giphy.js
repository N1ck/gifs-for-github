import GphApiClient from 'giphy-js-sdk-core'

export default class Giphy {
  constructor (apiToken) {
    if (!apiToken) {
      throw new Error('[GIPHY] API Token required')
    }
    this.client = GphApiClient(apiToken)
  }

  async search (query) {
    const { data: results } = await this.client.search('gifs', { q: query })
    return results
  }

  async getTrending () {
    const { data: results } = await this.client.trending('gifs')
    return results
  }
}
