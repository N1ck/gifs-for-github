import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const bundle = fileURLToPath(new URL('../distribution/main.js', import.meta.url));

function modernEditor(id, containerClass = 'CommentBoxContainer__9vE6Ia') {
  return `
    <slash-command-expander id="${id}">
      <fieldset class="fieldSet__Iyv63E">
        <div class="${containerClass} writeWrapper__4K2MB1">
          <div class="header__3BFPRT">
            <div class="toolbar__GIIR8l">
              <div data-component="ActionBar" class="prc-ActionBar-Nav-9spON">
                <div role="toolbar" aria-label="Formatting tools" class="prc-ActionBar-List-9uz46">
                  <button type="button">Bold</button>
                </div>
              </div>
              <button type="button">Saved replies</button>
            </div>
          </div>
          <textarea aria-label="Markdown value"></textarea>
        </div>
      </fieldset>
    </slash-command-expander>`;
}

function classicEditor(id) {
  return `
    <form id="${id}" class="js-inline-comment-form">
      <tab-container class="js-previewable-comment-form write-selected Box CommentBox">
        <div class="tabnav CommentBox-header">
          <markdown-toolbar class="CommentBox-toolbar" for="${id}-field">
            <action-bar class="ActionBar overflow-visible">
              <div class="ActionBar-item-container" data-target="action-bar.itemContainer">
                <button type="button">Bold</button>
              </div>
            </action-bar>
          </markdown-toolbar>
        </div>
        <file-attachment role="tabpanel">
          <div class="js-write-bucket position-relative">
            <text-expander>
              <slash-command-expander>
                <div class="CommentBox-container">
                  <textarea id="${id}-field" name="comment[body]" class="js-comment-field CommentBox-input"></textarea>
                </div>
              </slash-command-expander>
            </text-expander>
          </div>
        </file-attachment>
      </tab-container>
    </form>`;
}

async function setup(page, markup, settings = {}) {
  await page.setContent(`
    <style>
      body { margin: 40px; }
      slash-command-expander, form { display: block; width: 650px; margin-bottom: 20px; }
      fieldset { border: 0; padding: 0; }
      textarea { width: 100%; height: 80px; }
      .writeWrapper__4K2MB1 { contain: layout style; }
      .toolbar__GIIR8l { display: flex; justify-content: flex-end; }
      .CommentBox-header { display: flex; justify-content: flex-end; }
      .CommentBox-toolbar { display: flex; }
      .CommentBox-container { overflow: hidden; }
      [data-component="ActionBar"], [aria-label="Formatting tools"] { overflow: hidden; }
      .toolbar-item { position: relative; }
      .position-absolute { position: absolute; }
      .right-0 { right: 0; }
      .ghg-modal { background: white; }
    </style>
    ${markup}
  `);
  await page.evaluate((settings) => {
    globalThis.browser = { storage: { sync: {
      get: async defaults => ({ ...defaults, giphyApiKey: 'test-key', ...settings }),
    } } };
    globalThis.fetch = async (url) => {
      const query = new URL(url).searchParams.get('q') || 'trending';
      return { status: 200, json: async () => ({ data: [{ images: {
        original: { size: '1', url: `https://example.invalid/${query}.gif` },
        fixed_width: {
          width: '145',
          height: '90',
          url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        },
      } }] }) };
    };
  }, settings);
  await page.addScriptTag({ path: bundle });
}

for (const id of ['issue', 'review']) {
  test(`new ${id} editor keeps the picker outside the clipping ActionBar`, async ({ page }) => {
    await setup(page, `
    <div data-testid="comment-composer">${modernEditor('issue', 'CommentBox__I-zw2x')}</div>
    ${modernEditor('review', 'ConversationCommentBox__0Itdcg')}
  `);
    await expect(page.locator('.ghg-trigger')).toHaveCount(2);
    await page.locator('#issue textarea').fill('Issue draft');
    await page.locator('#review textarea').fill('Review draft');

    const editor = page.locator(`#${id}`);
    await expect(editor.locator('[data-component="ActionBar"] .ghg-trigger')).toHaveCount(0);
    await editor.locator('summary').click();
    const gif = editor.locator('.ghg-gif-selection');
    await expect(gif).toBeVisible();
    expect(await gif.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === element;
    })).toBe(true);
    await gif.click();
    await expect(editor.locator('textarea')).toHaveValue(`${id === 'issue' ? 'Issue' : 'Review'} draft<img src="https://example.invalid/trending.gif"/>`);
    await expect(editor.locator('.ghg-trigger')).not.toHaveAttribute('open');
    const otherId = id === 'issue' ? 'review' : 'issue';
    await expect(page.locator(`#${otherId} textarea`)).toHaveValue(otherId === 'issue' ? 'Issue draft' : 'Review draft');
  });
}

test('review editors added after load attach once and survive toolbar replacement', async ({ page }) => {
  await setup(page, '<div id="editors"></div>');
  await page.locator('#editors').evaluate((element, markup) => {
    element.innerHTML = markup;
  }, modernEditor('inline'));
  const editor = page.locator('#inline');
  await expect(editor.locator('.ghg-trigger')).toHaveCount(1);
  await editor.locator('.toolbar__GIIR8l').evaluate((element) => {
    element.innerHTML = `
      <div data-component="ActionBar">
        <div role="toolbar" aria-label="Formatting tools"><button type="button">Bold</button></div>
      </div>`;
  });
  await expect(editor.locator('.ghg-trigger')).toHaveCount(1);
  await editor.locator('summary').click();
  await editor.locator('.ghg-gif-selection').click();
  await expect(editor.locator('textarea')).toHaveValue('<img src="https://example.invalid/trending.gif"/>');
});

for (const id of ['classic-inline', 'classic-review']) {
  test(`${id} supports search and insertion with nested ActionBar and textarea expanders`, async ({ page }) => {
    await setup(page, `
      <div role="toolbar" aria-label="Pull request toolbar" class="toolbar__GIIR8l"><button>All commits</button></div>
      <table><tbody id="diff-comments"></tbody></table>
      <anchored-position id="review-changes-modal" role="dialog" style="display: block; overflow: hidden;">
        <div class="Overlay Overlay--size-auto">
          <div class="Overlay-body" style="height: 140px; overflow-y: auto;">${classicEditor('classic-review')}</div>
        </div>
      </anchored-position>
    `);
    await page.locator('#diff-comments').evaluate((element, markup) => {
      element.innerHTML = `<tr><td>${markup}</td></tr>`;
    }, classicEditor('classic-inline'));
    await expect(page.locator('.ghg-trigger')).toHaveCount(2);
    await expect(page.locator('[aria-label="Pull request toolbar"] .ghg-trigger')).toHaveCount(0);
    const editor = page.locator(`#${id}`);
    const otherId = id === 'classic-inline' ? 'classic-review' : 'classic-inline';
    await page.locator(`#${otherId} textarea`).fill('Other draft');
    await editor.locator('textarea').fill('Before after');
    await editor.locator('textarea').evaluate(element => element.setSelectionRange(7, 7));
    await editor.locator('summary').click();
    await editor.locator('.ghg-search-input').pressSequentially('cats');
    const gif = editor.locator('.ghg-gif-selection');
    await expect(gif).toHaveAttribute('data-full-size-url', 'https://example.invalid/cats.gif');
    expect(await gif.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.bottom - 1) === element;
    })).toBe(true);
    await gif.click();
    await expect(editor.locator('textarea')).toHaveValue('Before <img src="https://example.invalid/cats.gif"/>after');
    await expect(page.locator(`#${otherId} textarea`)).toHaveValue('Other draft');
    await expect(editor.locator('.ghg-trigger')).not.toHaveAttribute('open');
  });
}

test('review dialog scrolling only yields to its open GIF picker', async ({ page }) => {
  await setup(page, `
    <div data-component="AnchoredOverlay" role="dialog">
      <div id="review-body" style="height: 100px; overflow: auto;">${modernEditor('review')}</div>
      <footer>Submit review</footer>
    </div>
    <div data-component="AnchoredOverlay" role="dialog">
      <div id="other-body" style="height: 100px; overflow: auto;">Other dialog</div>
    </div>
  `);
  const body = page.locator('#review-body');
  await expect(body).toHaveCSS('overflow', 'auto');
  await page.locator('summary').click();
  await expect(body).toHaveCSS('overflow', 'visible');
  await expect(page.locator('#other-body')).toHaveCSS('overflow', 'auto');
  const gif = page.locator('.ghg-gif-selection');
  await expect(gif).toBeVisible();
  expect(await gif.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.bottom - 1) === element;
  })).toBe(true);
  await gif.click();
  await expect(body).toHaveCSS('overflow', 'auto');
});

test('slash commands recognize new review editors', async ({ page }) => {
  await setup(page, modernEditor('review'), { enableSlashCommand: true });
  await expect(page.locator('.ghg-trigger')).toHaveCount(1);
  await page.locator('textarea').fill('/gif cats');
  await page.locator('.ghg-slash-popup .ghg-gif-selection').click();
  await expect(page.locator('textarea')).toHaveValue('<img src="https://example.invalid/cats.gif"/>');
});
