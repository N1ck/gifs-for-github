// Lovingly copied from https://github.com/refined-github/refined-github/blob/main/source/helpers/selector-observer.tsx

const ANIMATION_NAME = 'ghg-selector-observer';

// Register the animation once
function registerAnimation() {
  if (!document.querySelector(`style[data-name="${ANIMATION_NAME}"]`)) {
    const style = document.createElement('style');
    style.setAttribute('data-name', ANIMATION_NAME);
    style.textContent = `@keyframes ${ANIMATION_NAME} {}`;
    document.head.append(style);
  }
}

/**
 * Observe elements matching a selector and call a callback when they appear.
 * Uses CSS animations for better performance and reliability than MutationObserver.
 * @param {string} selector - The CSS selector to match
 * @param {function(Element)} callback - Function to call when an element matches
 * @param {object} options - Options object
 * @param {boolean} [options.once] - Whether to stop observing after first match
 * @param {AbortSignal} [options.signal] - AbortSignal to stop observing
 */
export function observe(selector, callback, { once = false, signal } = {}) {
  if (signal?.aborted) {
    return;
  }

  // Register the animation if not already done
  registerAnimation();

  // Create a unique class to mark seen elements
  const seenClass = `ghg-seen-${Math.random().toString(36).slice(2)}`;

  // Add the style that triggers animations on matching elements
  const rule = document.createElement('style');
  rule.textContent = `
    ${selector}:not(.${seenClass}) {
      animation: 1ms ${ANIMATION_NAME};
    }
  `;
  document.body.prepend(rule);

  // Clean up when aborted
  signal?.addEventListener('abort', () => {
    rule.remove();
  });

  // Listen for animation starts
  globalThis.addEventListener(
    'animationstart',
    (event) => {
      if (event.animationName !== ANIMATION_NAME) {
        return;
      }

      const target = event.target;
      if (target.classList.contains(seenClass) || !target.matches(selector)) {
        return;
      }

      // Mark as seen
      target.classList.add(seenClass);

      // Call the callback
      callback(target);
    },
    { once, signal },
  );
}

/**
 * Wait for an element matching the selector to appear
 * @param {string} selector - The CSS selector to match
 * @param {object} options - Options object
 * @param {AbortSignal} [options.signal] - AbortSignal to stop waiting
 * @returns {Promise<Element>} The matching element or null if aborted
 */
export function waitForElement(selector, { signal } = {}) {
  const controller = new AbortController();
  const localSignal = signal ?
      AbortSignal.any([signal, controller.signal]) :
    controller.signal;

  return new Promise((resolve) => {
    observe(
      selector,
      (element) => {
        resolve(element);
        controller.abort();
      },
      { signal: localSignal, once: true },
    );

    localSignal.addEventListener('abort', () => {
      resolve();
    });
  });
}
