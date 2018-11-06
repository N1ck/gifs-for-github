import Giphy from './giphy'
import GiphyToolbarItem from '../components/giphy-toolbar-item'
import LoadingIndicator from '../components/loading-indicator'
import Masonry from 'masonry-layout'
import debounce from 'debounce-fn'
import delegate from 'delegate'
import gitHubInjection from 'github-injection'
import { h } from 'dom-chef'
import observeEl from '../simplified-element-observer'
import onetime from 'onetime'
import select from 'select-dom'

// Create a new Giphy Client
const giphyClient = new Giphy('Mpy5mv1k9JRY2rt7YBME2eFRGNs7EGvQ')

/**
 * Responds to the GIPHY modal being opened or closed.
 */
function watchGiphyModals () {
  for (const trigger of select.all('.ghg-trigger')) {
    observeEl(
      trigger,
      async () => {
        // The modal has been opened.
        if (trigger.hasAttribute('open')) {
          const parent = trigger.closest('.ghg-has-giphy-field')
          const resultsContainer = select('.ghg-giphy-results', parent)
          const searchInput = select('.ghg-search-input', parent)

          // If the modal has been opened and there is no search term,
          // and no search results, load the trending gifs
          if (searchInput.value === '' && resultsContainer.dataset.hasResults === 'false') {
            // Set the loading state
            resultsContainer.append(<div>{LoadingIndicator}</div>)

            // Fetch the trending gifs
            const gifs = await giphyClient.getTrending()

            // Add the gifs to the results container
            addResults(resultsContainer, gifs)
          }
        }
      },
      { attributes: true } // observe attributes, we are interested in the 'open' attribute
    )
  }
}

/**
 * Adds the GIF toolbar button to all WYSIWYG instances.
 */
function addToolbarButton () {
  for (const toolbar of select.all('form:not(.ghg-has-giphy-field) markdown-toolbar')) {
    const form = toolbar.closest('form')

    observeEl(toolbar, () => {
      const toolbarGroup = select('.toolbar-group:last-child', toolbar)
      if (toolbarGroup) {
        toolbarGroup.append(GiphyToolbarItem)
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
    resultContainer.dataset.hasResults = false
  }
}

async function searchGifs (e) {
  e.preventDefault()
  const searchQuery = e.target.value
  const parent = e.target.closest('.ghg-has-giphy-field')
  const resultsContainer = select('.ghg-giphy-results', parent)
  let gifs

  if (searchQuery === '') {
    gifs = await giphyClient.getTrending()
  } else {
    gifs = await giphyClient.search(searchQuery)
  }

  resultsContainer.append(<div>{LoadingIndicator}</div>)
  addResults(resultsContainer, gifs)
}

function addResults (resultsContainer, gifs) {
  const MAX_GIF_WIDTH = 145
  resultsContainer.innerHTML = ''
  resultsContainer.dataset.hasResults = true

  if (!gifs || !gifs.length) {
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
  addToolbarButton()
  listenOnce()
  // Clears all gif search input fields and results.
  // We have to do this because when navigating, github will refuse to
  // load the giphy URLs as it violates their Content Security Policy.
  clearSearch()
  watchGiphyModals()
})
