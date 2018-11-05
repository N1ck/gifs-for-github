import GphApiClient from 'giphy-js-sdk-core'
import LoadingIndicator from './components/loading-indicator'
import Masonry from 'masonry-layout'
import debounce from 'debounce-fn'
import delegate from 'delegate'
import gitHubInjection from 'github-injection'
import { h } from 'dom-chef'
import observeEl from './simplified-element-observer'
import onetime from 'onetime'
import select from 'select-dom'
const client = GphApiClient('Mpy5mv1k9JRY2rt7YBME2eFRGNs7EGvQ')

async function searchGiphy (q, offset = 0) {
  const { data: results } = await client.search('gifs', { q, offset, limit: 50 })
  return results
}

async function getTrendingGiphy (offset = 0) {
  const { data: results } = await client.trending('gifs', { offset })
  return results
}

function watchPopovers () {
  for (const trigger of select.all('.ghg-trigger')) {
    observeEl(
      trigger,
      async () => {
        if (trigger.hasAttribute('open')) {
          const parent = trigger.closest('.ghg-has-giphy-field')
          const resultsContainer = select('.ghg-giphy-results', parent)
          const searchInput = select('.ghg-search-input', parent)
          const initInfiniteScroll = onetime(bindInfiniteScroll.bind(this, resultsContainer))

          // Bind the scroll event to the results container
          initInfiniteScroll()

          // If the popover is opened, and there is no search term,
          // load popular gifs
          if (searchInput.value === '') {
            resultsContainer.append(<div>{LoadingIndicator}</div>)
            const gifs = await getTrendingGiphy()
            addResults(resultsContainer, gifs)
          }
        }
      },
      { attributes: true } // observe attributes, we are interested in the 'open' attribute.
    )
  }
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
              class='select-menu-modal position-absolute right-0 ghg-modal'
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
                      class='form-control ghg-search-input'
                      placeholder='Search for a GIF…'
                      aria-label='Search for a GIF'
                      autofocus=''
                    />
                  </div>
                </div>
                <div
                  class='ghg-giphy-results'
                  style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}
                />
              </tab-list>
            </details-menu>
          </details>
        )
        form.classList.add('ghg-has-giphy-field')
      }
    })
  }
}

function clearSearch () {
  for (const ghgModal of select.all('.ghg-modal')) {
    const resultContainer = select('.ghg-giphy-results', ghgModal)
    const searchInput = select('.ghg-search-input', ghgModal)
    searchInput.value = ''
    resultContainer.innerHTML = ''
    resultContainer.dataset.offset = 0
    resultContainer.dataset.searchQuery = ''
  }
}

async function searchGifs (e) {
  e.preventDefault()
  const searchQuery = e.target.value
  const parent = e.target.closest('.ghg-has-giphy-field')
  const resultsContainer = select('.ghg-giphy-results', parent)
  const numResults = 50
  let gifs

  resultsContainer.dataset.offset = 0
  resultsContainer.dataset.searchQuery = searchQuery

  if (searchQuery === '') {
    gifs = await getTrendingGiphy()
  } else {
    gifs = await searchGiphy(searchQuery)
  }

  resultsContainer.append(<div>{LoadingIndicator}</div>)
  addResults(resultsContainer, gifs)
}

function appendResults (...args) {
  addResults(...args, true)
}

function addResults (resultsContainer, gifs, append = false) {
  const MAX_GIF_WIDTH = 145

  if (!append) {
    resultsContainer.innerHTML = ''
  }

  if (!gifs || (!gifs.length && !append)) {
    resultsContainer.append(<div class='ghg-no-results-found'>No GIFs found.</div>)
  }

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

function preventFormSubmitOnEnter (e) {
  if (e.keyCode == 13) {
    e.preventDefault()
    return false
  }
}

function bindInfiniteScroll (resultsContainer) {
  resultsContainer.addEventListener('scroll', handleInfiniteScroll)
}

let searchTimer
function handleInfiniteScroll (event) {
  const resultsContainer = event.target
  const currentScrollPosition = resultsContainer.scrollTop + 395
  const INFINITE_SCROLL_PX_OFFSET = 100

  if (currentScrollPosition + INFINITE_SCROLL_PX_OFFSET > parseInt(resultsContainer.style.height)) {
    // start the infinite scroll after the last scroll event
    clearTimeout(searchTimer)
    searchTimer = setTimeout(async function (event) {
      const offset = resultsContainer.dataset.offset ? parseInt(resultsContainer.dataset.offset) + 50 : 50
      const searchQuery = resultsContainer.dataset.searchQuery
      let gifs

      resultsContainer.dataset.offset = offset

      if (searchQuery) {
        gifs = await searchGiphy(searchQuery, offset)
      } else {
        gifs = await getTrendingGiphy(offset)
      }

      appendResults(resultsContainer, gifs)
    }, 250)
  }
}

function listen () {
  delegate('.ghg-gif-selection', 'click', selectGif)
  delegate('.ghg-has-giphy-field .ghg-search-input', 'keydown', debounce(searchGifs, { wait: 400 }))
  delegate('.ghg-has-giphy-field .ghg-search-input', 'keypress', preventFormSubmitOnEnter)
}

// Ensure we only bind events to elements once
const listenOnce = onetime(listen)

// gitHubInjection fires when there's a pjax:end event
// on github, this happens when a page is loaded
gitHubInjection(() => {
  addButton()
  listenOnce()
  // Clears all gif search input fields and results.
  // We have to do this because when navigating, github will refuse to
  // load the giphy URLs as it violates their Content Security Policy.
  clearSearch()
  watchPopovers()
})
