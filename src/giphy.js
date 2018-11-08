import GphApiClient from 'giphy-js-sdk-core'

export default class Giphy {
  constructor (apiToken) {
    if (!apiToken) {
      throw new Error('[GIPHY] API Token required')
    }
    this.client = GphApiClient(apiToken)
  }

  async search (q, offset = 0) {
    const { data: results } = await this.client.search('gifs', { q, offset, limit: 50 })
    return results
  }

  async getTrending (offset = 0) {
    const { data: results } = await this.client.trending('gifs', { offset, limit: 50 })
    return results
  }
}
