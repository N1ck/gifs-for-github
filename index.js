import GphApiClient from 'giphy-js-sdk-core'
import Masonry from 'masonry-layout'
import debounce from 'debounce-fn'
import delegate from 'delegate'
import gitHubInjection from 'github-injection'
import { h } from 'dom-chef'
import observeEl from './simplified-element-observer'
import onetime from 'onetime'
import select from 'select-dom'
const client = GphApiClient('Mpy5mv1k9JRY2rt7YBME2eFRGNs7EGvQ')

async function searchGifs (query) {
  const { data: results } = await client.search('gifs', { q: query })
  return results
}

function addButton () {
  for (const toolbar of select.all('form:not(.ghg-has-giphy-field) markdown-toolbar')) {
    const form = toolbar.closest('form')

    observeEl(toolbar, () => {
      const toolbarGroup = select('.toolbar-group:last-child', toolbar)
      if (toolbarGroup) {
        toolbarGroup.append(
          <details class='details-reset details-overlay toolbar-item select-menu select-menu-modal-right ghg-trigger'>
            <summary class='menu-target' aria-label='Insert a GIF' aria-haspopup='menu'>
              {'GIF'}
            </summary>
            <details-menu
              class='select-menu-modal position-absolute right-0'
              style={{ 'z-index': 99, width: '480px', 'max-height': '410px' }}
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
                      class='form-control ghg-search'
                      placeholder='Search for a GIF…'
                      aria-label='Search for a GIF'
                      autofocus=''
                    />
                  </div>
                </div>
                <div class='ghg-giphy-results' />
              </tab-list>
            </details-menu>
          </details>
        )
        form.classList.add('ghg-has-giphy-field')
      }
    })
  }
}

async function showGiphyPopover (e) {
  const MAX_GIF_WIDTH = 145
  const searchQuery = e.target.value
  const parent = e.target.closest('.ghg-has-giphy-field')
  const gifs = await searchGifs(searchQuery)
  const resultsContainer = select('.ghg-giphy-results', parent)

  resultsContainer.innerHTML = ''

  const gifsToAdd = []
  gifs.forEach(gif => {
    const url = gif.images.fixed_height_downsampled.url
    const height = Math.floor(gif.images.fixed_width.height * MAX_GIF_WIDTH / gif.images.fixed_width.width)
    const img = <div style={{ width: '145px' }}><img src={url} height={height} class='ghg-gif-selection' /></div>
    gifsToAdd.push(img)
    resultsContainer.append(img)
  })

  const masonry = new Masonry(
    resultsContainer,
    {
      itemSelector: '.ghg-giphy-results div',
      columnWidth: 145,
      gutter: 10,
      transitionDuration: '0.2s'
      // fitWidth: true
    },
    2000
  )
}

function selectGif (e) {
  const form = e.target.closest('.ghg-has-giphy-field')
  const commentField = select('.js-comment-field', form)
  const trigger = select('.ghg-trigger', form)
  const gifUrl = e.target.src

  // Close the popover
  trigger.removeAttribute('open')

  // Focuses the textarea and inserts the text where the cursor was last
  commentField.focus()
  document.execCommand('insertText', false, `![](${gifUrl})`)
}

function listen () {
  delegate('.ghg-gif-selection', 'click', selectGif)
  delegate('.ghg-has-giphy-field .ghg-search', 'keydown', debounce(showGiphyPopover, { wait: 400 }))
}

// Ensure we only bind events to elements once
const listenOnce = onetime(listen)

// gitHubInjection fires when there's a pjax:end event
// on github, this happens when a page is loaded
gitHubInjection(() => {
  addButton()
  listenOnce()
})
