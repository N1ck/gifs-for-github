import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const bundle = fileURLToPath(new URL('../distribution/main.js', import.meta.url));
const popup = '.ghg-slash-popup';
const results = `${popup} .ghg-slash-popup-results`;
const images = `${results} img`;
let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.clock.install();
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

async function setup(page, settings = {}) {
  await page.setContent(`
    <style>
      body { margin: 20px; }
      textarea { width: 600px; height: 100px; }
      form { margin-bottom: 20px; }
    </style>
    <form id="one"><markdown-toolbar></markdown-toolbar><textarea id="a"></textarea></form>
    <form><textarea id="b"></textarea></form>
    <form><div id="editable" contenteditable="true" role="textbox"></div></form>
  `);
  await page.evaluate((settings) => {
    const stored = { enableSlashCommand: true, giphyApiKey: 'test-key', ...settings };
    globalThis.requests = [];
    globalThis.pendingSettings = [];
    globalThis.holdSettings = false;
    globalThis.browser = { storage: { sync: {
      get: (defaults) => {
        const value = { ...defaults, ...stored };
        return globalThis.holdSettings ?
          new Promise(resolve => globalThis.pendingSettings.push(() => resolve(value))) :
            Promise.resolve(value);
      },
      set: async values => Object.assign(stored, values),
    } } };
    globalThis.fetch = url => new Promise((resolve, reject) => {
      globalThis.requests.push({ query: new URL(url).searchParams.get('q'), resolve, reject });
    });
  }, settings);
  await page.addScriptTag({ path: bundle });
  await expect(page.locator('.ghg-trigger')).toBeAttached();
}

async function resolveSearch(page, request = 0, count = 12) {
  await page.waitForFunction(index => globalThis.requests.length > index, request);
  await page.evaluate(({ request, count }) => {
    const gifs = Array.from({ length: count }, (_, index) => ({
      images: {
        original: { size: '1', url: `https://example.invalid/${request}-${index}.gif` },
        downsized: { url: `https://example.invalid/${request}-${index}.gif` },
        fixed_width: {
          width: '145',
          height: '90',
          url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        },
      },
    }));
    globalThis.requests[request].resolve({ status: 200, json: async () => ({ data: gifs }) });
  }, { request, count });
  await page.clock.runFor(20);
}

async function openSearch(page) {
  await page.locator('#a').fill('/gif cats');
  await resolveSearch(page);
  await expect(page.locator(images)).toHaveCount(12);
}

async function expectWithinViewport(page) {
  const bounds = await page.locator(popup).boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  const scroller = await page.locator(results).boundingBox();
  expect(scroller.height).toBeGreaterThan(90);
  expect(scroller.y + scroller.height).toBeLessThanOrEqual(bounds.y + bounds.height);
}

test('Tab to another comment leaves its keyboard input alone', async ({ page }) => {
  await setup(page);
  await page.locator('#b').fill('Other comment');
  await openSearch(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#b')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#b')).toHaveValue('Other comment\n');
  await expect(page.locator('#a')).toHaveValue('/gif cats');
  await expect(page.locator(popup)).toBeHidden();
});

test('Enter selects the GIF reached by ArrowDown then Tab', async ({ page }) => {
  await setup(page);
  await openSearch(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(images).first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator(images).nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#a')).toHaveValue('<img src="https://example.invalid/0-1.gif"/>');
  await expect(page.locator('#a')).toBeFocused();
});

test('Arrow keys follow the focused result and Space selects it', async ({ page }) => {
  await setup(page);
  await openSearch(page);
  await page.locator(images).nth(2).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(images).nth(3)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator(images).nth(2)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#a')).toHaveValue('<img src="https://example.invalid/0-2.gif"/>');
});

test('Escape from a result returns focus to the comment', async ({ page }) => {
  await setup(page);
  await openSearch(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.locator('#a')).toBeFocused();
  await expect(page.locator(popup)).toBeHidden();
  await expect(page.locator('#a')).toHaveValue('/gif cats');
});

test('tall textareas keep results inside the viewport', async ({ page }) => {
  await setup(page);
  await page.locator('#a').evaluate(element => element.style.height = '850px');
  await openSearch(page);
  await expectWithinViewport(page);
  await page.locator(images).first().click();
  await expect(page.locator('#a')).toHaveValue('<img src="https://example.invalid/0-0.gif"/>');
});

test('resizing keeps the final result reachable in the scroller', async ({ page }) => {
  await setup(page);
  await page.locator('#one').evaluate(element => element.style.marginTop = '250px');
  await page.locator('#a').evaluate(element => element.style.height = '300px');
  await openSearch(page);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.clock.runFor(150);
  await expectWithinViewport(page);
  await page.locator(results).evaluate(element => element.scrollTop = element.scrollHeight);
  await page.clock.runFor(20);
  const last = await page.locator(images).last().boundingBox();
  const scroller = await page.locator(results).boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(scroller.y + scroller.height + 1);
  await page.locator(images).last().click();
  await expect(page.locator('#a')).toHaveValue('<img src="https://example.invalid/0-11.gif"/>');
});

test('a narrow viewport keeps the popup on screen', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 500 });
  await openSearch(page);
  await expectWithinViewport(page);
});

test('disabled slash commands preserve the existing toolbar insertion', async ({ page }) => {
  await setup(page, { enableSlashCommand: false });
  await page.locator('#a').fill('Hello /gif');
  await expect(page.locator(popup)).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.requests.length)).toBe(0);
  await page.locator('#one summary').click();
  await resolveSearch(page, 0, 1);
  await page.locator('#one .ghg-gif-selection').click();
  await expect(page.locator('#a')).toHaveValue('Hello /gif<img src="https://example.invalid/0-0.gif"/>');
});

test('a newline after a bare command preserves the following sentence', async ({ page }) => {
  await setup(page);
  await page.locator('#a').fill('/gif');
  await resolveSearch(page);
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('Keep this sentence');
  await page.clock.runFor(500);
  await expect(page.locator('#a')).toHaveValue('/gif\nKeep this sentence');
  await expect(page.locator(popup)).toBeHidden();
});

test('late results cannot overwrite a newer search', async ({ page }) => {
  await setup(page);
  await page.locator('#a').fill('/gif cats');
  await page.locator('#a').fill('/gif dogs');
  await page.clock.runFor(500);
  await resolveSearch(page, 1, 1);
  await resolveSearch(page, 0, 1);
  await expect(page.locator(images)).toHaveAttribute('data-full-size-url', 'https://example.invalid/1-0.gif');
});

test('changing focus cancels insertion while settings are pending', async ({ page }) => {
  await setup(page);
  await openSearch(page);
  await page.evaluate(() => globalThis.holdSettings = true);
  await page.locator(images).first().click();
  await page.waitForFunction(() => globalThis.pendingSettings.length === 1);
  await page.locator('#b').fill('Other comment');
  await page.evaluate(() => globalThis.pendingSettings.shift()());
  await page.clock.runFor(20);
  await expect(page.locator('#a')).toHaveValue('/gif cats');
  await expect(page.locator('#b')).toHaveValue('Other comment');
});

test('click insertion preserves surrounding text and undo', async ({ page }) => {
  await setup(page);
  await page.locator('#a').fill('Before\n/gif cats');
  await resolveSearch(page);
  await page.locator(images).first().click();
  await expect(page.locator('#a')).toHaveValue('Before\n<img src="https://example.invalid/0-0.gif"/>');
  await page.evaluate(() => document.execCommand('undo'));
  await expect(page.locator('#a')).toHaveValue('Before\n/gif cats');
});

test('contenteditable comments support keyboard insertion', async ({ page }) => {
  await setup(page);
  await page.locator('#editable').fill('/gif cats');
  await resolveSearch(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#editable')).toHaveText('<img src="https://example.invalid/0-0.gif"/>');
});
