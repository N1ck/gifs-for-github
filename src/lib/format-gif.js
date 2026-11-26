/**
 * Builds the HTML snippets inserted into GitHub comments
 */

/**
 * Builds the <img> tag for a GIF, applying the configured width if any
 * @param {string} url - The GIF URL
 * @param {string|number} width - The configured width (digits only), empty for default
 * @returns {string} The <img> HTML snippet
 */
export function formatGifImage(url, width) {
  const parsedWidth = Number.parseInt(String(width ?? '').replaceAll(/\D/g, ''), 10);
  return parsedWidth > 0 ?
    `<img src="${url}" width="${parsedWidth}"/>` :
    `<img src="${url}"/>`;
}

/**
 * Builds the full snippet inserted into a comment
 * @param {object} options
 * @param {string} options.url - The GIF URL
 * @param {string|number} [options.width] - The configured width, empty for default
 * @param {boolean} [options.collapsible] - Wrap the GIF in a <details> block
 * @param {string} [options.summary] - Summary text of the <details> block
 * @returns {string} The HTML snippet to insert
 */
export function formatGif({ url, width, collapsible = false, summary }) {
  const gifImage = formatGifImage(url, width);

  if (!collapsible) {
    return gifImage;
  }

  return `<details open>\n  <summary><i>${summary || 'GIF'}</i></summary>\n  ${gifImage}\n</details>`;
}
