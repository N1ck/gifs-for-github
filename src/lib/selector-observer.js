// Lovingly copied from https://github.com/refined-github/refined-github/blob/main/source/helpers/selector-observer.tsx
// eslint-disable-next-line no-unused-vars
import { h } from 'dom-chef'
import {css} from 'code-tag'
import onetime from 'onetime'

import getCallerID from './caller-id.js'

const animation = 'rgh-selector-observer'
const getListener = (seenMark, selector, callback) =>
  function (event) {
    const target = event.target
    // The target can match a selector even if the animation actually happened on a ::before pseudo-element, so it needs an explicit exclusion here
    if (target.classList.contains(seenMark) || !target.matches(selector)) {
      return
    }

    // Removes this specific selector's animation once it was seen
    target.classList.add(seenMark)

    callback(target)
  }

const registerAnimation = onetime(() => {
  document.head.append(<style>{`@keyframes ${animation} {}`}</style>)
})

export default function observe(selectors, listener, {signal} = {}) {
  if (signal?.aborted) {
    return
  }

  const selector = String(selectors) // Array#toString() creates a comma-separated string
  const seenMark = 'rgh-seen-' + getCallerID()

  registerAnimation()

  const rule = document.createElement('style')

  rule.textContent = css`
    :where(${String(selector)}):not(.${seenMark}) {
      animation: 1ms ${animation};
    }
  `
  document.body.prepend(rule)
  signal?.addEventListener('abort', () => {
    rule.remove()
  })
  window.addEventListener(
    'animationstart',
    getListener(seenMark, selector, listener),
    {signal}
  )
}
