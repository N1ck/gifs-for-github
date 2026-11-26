/**
 * Builds the HTML snippets inserted into GitHub comments
 */

/**
 * Builds the full snippet inserted into a comment
 * @param {object} options
 * @param {string} options.url - The GIF URL
 * @param {boolean} [options.collapsible] - Wrap the GIF in a <details> block
 * @param {string} [options.summary] - Summary text of the <details> block
 * @returns {string} The HTML snippet to insert
 */
export function formatGif({ url, collapsible = false, summary }) {
  const gifImage = `<img src="${url}"/>`;

  if (!collapsible) {
    return gifImage;
  }

  return `<details open>\n  <summary><i>${summary || 'GIF'}</i></summary>\n  ${gifImage}\n</details>`;
}
