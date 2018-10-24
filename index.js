import GphApiClient from 'giphy-js-sdk-core'
import debounce from 'debounce-fn'
import delegate from 'delegate'
import { h } from 'dom-chef'
import select from 'select-dom'

const client = GphApiClient('Mpy5mv1k9JRY2rt7YBME2eFRGNs7EGvQ')

async function searchGifs (query) {
  const { data: results } = await client.search('gifs', { q: query })
  return results
}

function addButton () {
  for (const toolbar of select.all('form:not(.ghg-has-giphy-field) markdown-toolbar')) {
    const form = toolbar.closest('form')
    if (!select.exists('.js-manual-file-chooser[type=file]', form)) {
      continue
    }
    const toolbarGroup = select('.toolbar-group:last-child', toolbar)
    if (toolbarGroup) {
      toolbarGroup.append(
        <details class='details-reset details-overlay toolbar-item select-menu select-menu-modal-right ghg-trigger'>
          <summary class='menu-target' aria-label='Insert a GIF' aria-haspopup='menu'>
            {'Select a GIF'}
          </summary>

          <details-menu
            class='select-menu-modal position-absolute right-0'
            style={{ 'z-index': 99, width: '480px' }}
            role='menu'
          >
            <div class='select-menu-header d-flex'>
              <span class='select-menu-title flex-auto'>Select a GIF</span>
            </div>

            <tab-list>
              <div class='select-menu-filters'>
                <div class='select-menu-text-filter'>
                  <input
                    type='text'
                    class='form-control'
                    placeholder='Search for a GIF…'
                    aria-label='Search for a GIF'
                    autofocus=''
                  />
                </div>
              </div>
              <div id='ghg-giphy-results' />
            </tab-list>
          </details-menu>
        </details>
      )
      form.classList.add('ghg-has-giphy-field')
    }
  }
}

async function showGiphyPopover (e) {
  const MAX_GIF_WIDTH = 145
  const searchQuery = e.target.value
  const parent = e.target.closest('.ghg-has-giphy-field')
  const gifs = await searchGifs(searchQuery)
  const resultContainer = select('#ghg-giphy-results', parent)

  resultContainer.innerHTML = ''

  gifs.forEach(gif => {
    const url = gif.images.fixed_height_downsampled.gif_url
    const height = Math.floor(gif.images.fixed_width.height * MAX_GIF_WIDTH / gif.images.fixed_width.width)
    resultContainer.append(<img src={url} height={height} class='ghg-gif-selection' />)
  })
}

function selectGif (e) {
  const gifUrl = e.target.src
  const form = e.target.closest('.ghg-has-giphy-field')
  const commentField = select('.js-comment-field', form)
  const newLine = String.fromCharCode(13, 10)

  const trigger = select('.ghg-trigger', form)
  trigger.removeAttribute('open')

  commentField.value += `${newLine}![](${gifUrl})`
}

function listen () {
  delegate('.ghg-gif-selection', 'click', selectGif)
  delegate('.ghg-has-giphy-field', 'keydown', debounce(showGiphyPopover, { wait: 400 }))
}

addButton()
listen()
