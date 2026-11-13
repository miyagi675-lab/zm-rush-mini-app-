import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = process.env.MINI_APP_PLAYWRIGHT_PATH
  ? require(process.env.MINI_APP_PLAYWRIGHT_PATH)
  : require('playwright-core');
const site = fileURLToPath(new URL('../', import.meta.url));
const mount = '/zm-rush-mini-app-/';
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith(mount)) throw Error('Outside mount');
    const path = resolve(site, decodeURIComponent(url.pathname.slice(mount.length)) || 'index.html');
    const localPath = relative(site, path);
    if (localPath.startsWith('..') || isAbsolute(localPath)) throw Error('Outside site');
    const file = await stat(path);
    if (!file.isFile()) throw Error('Not a file');
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extname(path)) || 'application/octet-stream',
      'Content-Length': file.size,
    });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((done, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', done);
});
const origin = 'http://127.0.0.1:' + server.address().port;
const models = '#model-items .model-pick';
const pause = '#snapshot';
const defaultModel = /\/assets\/(?:web-v2\/)?gign\.mdl(?:\.gz)?(?:\?|$)/;
let browser;

async function newPage(width, height) {
  const context = await browser.newContext({viewport: {width, height}});
  // Keep the test offline apart from the local site. Receipt of a Telegram URL
  // is sufficient, so the test never contacts the seller or opens an app.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.href === 'https://telegram.org/js/telegram-web-app.js') {
      return route.fulfill({
        contentType: 'text/javascript',
        body: 'window.Telegram={WebApp:{ready(){},expand(){},isVersionAtLeast(){return true},'
          + 'disableVerticalSwipes(){window.swipesDisabled=true},setHeaderColor(){},'
          + 'setBackgroundColor(){},openTelegramLink(url){window.purchaseUrl=url}}};',
      });
    }
    return route.abort();
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.studioDraws = 0;
    for (const method of ['drawArrays', 'drawElements']) {
      const draw = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args) {
        if (this.canvas.parentElement?.id === 'viewport') window.studioDraws++;
        return draw.apply(this, args);
      };
    }
  });
  const errors = [];
  const requestFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    requestFailures.push(request.url() + ': ' + request.failure()?.errorText);
  });
  page.on('response', response => {
    if (!response.ok()) requestFailures.push(response.url() + ': HTTP ' + response.status());
  });
  return {page, errors, requestFailures, context};
}

async function waitForRetry(page, errors, requestFailures) {
  const retry = page.locator('#retry-model');
  try {
    await retry.waitFor({state: 'visible'});
  } catch (error) {
    const loading = await page.locator('#loading-message').textContent({timeout: 1000}).catch(() => null);
    throw new Error('Retry button did not appear. ' + JSON.stringify({loading, errors, requestFailures}), {cause:error});
  }
  return retry;
}

async function loadOk(page) {
  await page.locator('#loading').waitFor({state: 'hidden'});
  await page.waitForFunction(selector => !document.querySelector(selector).disabled, pause);
  assert.equal(await page.locator('#viewport canvas').count(), 1);
}

async function waitForStudioDraw(page) {
  const previous = await page.evaluate(() => window.studioDraws);
  await page.waitForFunction(draws => window.studioDraws > draws, previous);
}

async function assertOffscreenStudio(page) {
  await waitForStudioDraw(page);
  await page.setViewportSize({width: 1280, height: 180});
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.getElementById('viewport').getBoundingClientRect().bottom <= 0);
  const drawsWhileHidden = await page.evaluate(async () => {
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    // Allow the observer to process the scroll before measuring subsequent frames.
    await frame();
    await frame();
    const before = window.studioDraws;
    for (let index = 0; index < 8; index++) await frame();
    return window.studioDraws - before;
  });
  assert.equal(drawsWhileHidden, 0, 'An offscreen studio must stop drawing');

  const beforeSnapshot = await page.evaluate(() => window.studioDraws);
  await page.locator('#snapshot').click();
  assert(await page.evaluate(() => document.getElementById('viewport').getBoundingClientRect().bottom <= 0));
  assert.match(await page.locator('#photo').getAttribute('src'), /^data:image\/png;base64,/);
  assert(await page.evaluate(before => window.studioDraws > before, beforeSnapshot));
  await page.locator('#close-photo').click();

  await page.setViewportSize({width: 1280, height: 800});
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForStudioDraw(page);
}

async function assertPurchase(page, expectedName, expectedPrice) {
  const link = page.locator('#buy');
  await page.waitForFunction(name => document.querySelector('#purchase-name').textContent === name, expectedName);
  const price = (await page.locator('#purchase-price').textContent()).replace(/\s+/g, ' ').trim();
  assert.match(price, expectedPrice);
  const href = new URL(await link.getAttribute('href'));
  assert.equal(href.origin, 'https://t.me');
  assert(href.searchParams.get('text')?.includes(expectedName), 'Purchase draft has wrong product');
  await link.click();
  assert.equal(await page.evaluate(() => window.purchaseUrl), href.href);
}

try {
  browser = await chromium.launch({
    executablePath: process.env.MINI_APP_CHROMIUM || undefined,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });
  {
    const {page, errors, requestFailures, context} = await newPage(1280, 800);
    try {
      let outage = true;
      let failures = 0;
      await page.route(defaultModel, async route => {
        // The prefetch can fail before the app attaches to the same load. Keep
        // the initial outage active through both possible attempts.
        if (!outage) return route.continue();
        failures++;
        await route.fulfill({status: 503, body: 'Simulated temporary outage'});
      });
      await page.goto(origin + mount);
      const retry = await waitForRetry(page, errors, requestFailures);
      assert(failures > 0);
      await page.locator('#open-models').click();
      await page.locator(models).first().waitFor({state: 'visible'});
      assert(await page.locator(models).first().isEnabled(), 'Model picker must remain available after an error');
      outage = false;
      await retry.click();
      await loadOk(page);
      assert.equal(await retry.isVisible(), false);
      assert(await page.evaluate(() => window.swipesDisabled));
      await page.locator('#tab-weapons').click();
      await page.locator('#weapons-panel').waitFor({state: 'visible'});
      assert.equal((await page.locator('#weapons-panel').textContent()).trim(), 'Soon');
      await page.locator('#tab-weapons').press('Home');
      assert.equal(await page.locator('#tab-hats').getAttribute('aria-selected'), 'true');
      await assertOffscreenStudio(page);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  {
    const {page, errors, requestFailures, context} = await newPage(390, 844);
    try {
      await page.route(defaultModel, route => route.fulfill({
        status: 503, body: 'Simulated unavailable model',
      }));
      await page.goto(origin + mount);
      await waitForRetry(page, errors, requestFailures);
      await page.locator('#open-models').click();
      await page.locator('#model-items [data-model-id="dobby"] .model-pick').click();
      await loadOk(page);
      await assertPurchase(page, 'Добби', /^3 000 ₽ \/ месяц$/);
      await page.locator('#tab-hats').click();
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() => {
        const {top, bottom} = document.getElementById('viewport').getBoundingClientRect();
        return window.scrollY >= 600 && bottom > 0 && top < innerHeight;
      });
      await waitForStudioDraw(page);
      await page.locator('#items [data-id="bunny"] .item-pick').click();
      await page.locator('#purchase-options').waitFor({state: 'visible'});
      await page.waitForFunction(() => document.querySelector('#buy').getAttribute('aria-disabled') === 'false');
      const hat = await page.locator('#items [data-id="bunny"] .item-name').textContent();
      await assertPurchase(page, hat, /^Цена по запросу$/);
      await page.locator('[data-product-type="model"]').click();
      await assertPurchase(page, 'Добби', /^3 000 ₽ \/ месяц$/);
      await page.locator('[data-product-type="hat"]').click();
      await assertPurchase(page, hat, /^Цена по запросу$/);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log('Browser smoke passed: loading recovery, Weapons tab, visibility-aware 3D, and mobile purchases.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
