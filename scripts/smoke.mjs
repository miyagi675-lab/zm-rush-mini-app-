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

async function assertCompactPreview(page) {
  assert.equal(await page.locator('main > .workspace:first-child').count(), 1);
  assert.equal(await page.locator('#open-models, #player-model').count(), 0);
  const gap = await page.evaluate(() => document.querySelector('.studio').getBoundingClientRect().top
    - document.querySelector('header').getBoundingClientRect().bottom);
  assert(gap >= 0 && gap <= 16, 'Live Preview must begin just below the header');
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
  await page.waitForFunction(name => document.querySelector('#purchase-name').textContent === name, expectedName);
  const price = (await page.locator('#purchase-price').textContent()).replace(/\s+/g, ' ').trim();
  assert.match(price, expectedPrice);
}

async function assertCartCount(page, count) {
  const labels = page.locator('#cart-open-top [data-cart-count], #cart-open-bottom [data-cart-count]');
  assert.equal(await labels.count(), 2);
  assert.deepEqual((await labels.allTextContents()).map(text => text.trim()), [String(count), String(count)]);
}

async function addToCart(page, count) {
  const add = page.locator('#cart-add');
  await add.click();
  await assertCartCount(page, count);
  assert.equal(await add.isEnabled(), false, 'An item can only be added once');
  assert.equal(await page.locator('#cart-dialog').isVisible(), false, 'Adding an item should keep the player in the fitting room');
  assert.equal(await page.evaluate(() => window.purchaseUrl), undefined, 'Adding an item must not open Telegram');
}

async function assertCardCartButton(card, name, added) {
  const button = card.locator('.card-cart-button');
  assert.equal(await button.isEnabled(), !added);
  assert.equal(await button.getAttribute('aria-label'), (added ? 'Уже в корзине: ' : 'Добавить в корзину: ') + name);
  return button;
}

async function addFromCard(page, card, name, count) {
  const pick = card.locator('.model-pick, .item-pick');
  assert.equal(await pick.getAttribute('aria-pressed'), 'false', 'The tested product must start unequipped');
  const button = await assertCardCartButton(card, name, false);
  await button.click();
  await assertCardCartButton(card, name, true);
  await assertCartCount(page, count);
  assert.equal(await pick.getAttribute('aria-pressed'), 'false', 'Adding a product directly must leave it unequipped');
  assert.equal(await page.locator('#cart-dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => window.purchaseUrl), undefined);
}

async function openCart(page, opener) {
  await page.locator(opener).click();
  const cart = page.locator('#cart-dialog');
  await cart.waitFor({state: 'visible'});
  return cart;
}

async function assertCartTotal(cart, bucket, expected) {
  const text = (await cart.locator('[data-cart-total="' + bucket + '"]').innerText()).replace(/\s+/g, ' ').trim();
  assert.match(text, expected);
}

async function assertCheckout(page, names, excluded = []) {
  const checkout = page.locator('#cart-checkout');
  const href = new URL(await checkout.getAttribute('href'));
  assert.equal(href.origin, 'https://t.me');
  assert.equal(href.pathname.toLowerCase(), '/name_f1');
  const draft = href.searchParams.get('text');
  assert(draft, 'Checkout must prefill one Telegram message');
  for (const name of names) assert(draft.includes(name), 'Checkout draft omitted ' + name);
  for (const name of excluded) assert(!draft.includes(name), 'Checkout draft still lists ' + name);
  await checkout.click();
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
      await assertCompactPreview(page);
      const retry = await waitForRetry(page, errors, requestFailures);
      assert(failures > 0);
      await page.locator('#tab-models').click();
      await page.locator(models).first().waitFor({state: 'visible'});
      assert(await page.locator(models).first().isEnabled(), 'Model picker must remain available after an error');
      outage = false;
      await retry.click();
      await loadOk(page);
      assert.equal(await page.locator('#motion').inputValue(), 'run');
      assert.equal(await page.locator('#pause').getAttribute('aria-pressed'), 'false');
      assert.equal(await retry.isVisible(), false);
      assert(await page.evaluate(() => window.swipesDisabled));
      await page.locator('#tab-weapons').click();
      await page.locator('#weapons-panel').waitFor({state: 'visible'});
      const weapon = page.locator('[data-weapon-id="ak-47-dollar"] .item-pick');
      await page.locator('#weapon-search').fill('Dollar');
      assert.equal(await page.locator('#weapon-items article').count(), 1);
      assert.equal(await weapon.locator('.catalog-item-price').textContent(), '$9 / месяц');
      const thumbnail = weapon.locator('img');
      await page.waitForFunction(() => document.querySelector('#weapon-items img')?.naturalWidth > 0);
      assert.match(await thumbnail.getAttribute('src'), /ak-47-dollar\.webp\?v=2$/);
      await weapon.click();
      await loadOk(page);
      assert.equal(await weapon.getAttribute('aria-pressed'), 'true');
      await assertPurchase(page, 'AK-47 | Dollar', /^\$9 \/ месяц$/);
      assert.equal(await page.locator('#weapon-price').textContent(), 'Оружие · $9 / месяц');
      await page.locator('#weapon-search').fill('Tron');
      const tron = page.locator('[data-weapon-id="ak-47-tron"] .item-pick');
      await tron.click();
      await loadOk(page);
      assert.equal(await tron.getAttribute('aria-pressed'), 'true');
      await assertPurchase(page, 'AK-47 | Tron', /^\$9 \/ месяц$/);
      await page.locator('#tab-weapons').press('Home');
      assert.equal(await page.locator('#tab-hats').getAttribute('aria-selected'), 'true');
      await assertOffscreenStudio(page);
      await page.locator('#motion').selectOption('walk');
      await page.locator('#tab-hats').press('ArrowRight');
      await page.reload();
      await loadOk(page);
      assert.equal(await page.locator('#motion').inputValue(), 'walk');
      assert.equal(await page.locator('#tab-models').getAttribute('aria-selected'), 'true');
      await page.goto(origin + mount + '?tab=weapons');
      await loadOk(page);
      assert.equal(await page.locator('#tab-weapons').getAttribute('aria-selected'), 'true');
      await page.goto(origin + mount);
      await loadOk(page);
      assert.equal(await page.locator('#motion').inputValue(), 'walk');
      assert.equal(await page.locator('#tab-models').getAttribute('aria-selected'), 'true');
      await page.locator('#model-search').fill('Скирк');
      await page.locator('[data-model-id="p_skirk"] .model-pick').click();
      await loadOk(page);
      assert.equal(await page.locator('#model-label').textContent(), 'Скирк');
      await waitForStudioDraw(page);
      await page.locator('#model-search').fill('Зоро');
      await page.locator('[data-model-id="p_roronoa_zoro"] .model-pick').click();
      await loadOk(page);
      await page.locator('#head').click();
      await page.locator('#motion').selectOption('static');
      await waitForStudioDraw(page);
      assert.equal(await page.locator('#head').getAttribute('aria-pressed'), 'true');
      await page.locator('#snapshot').click();
      assert.match(await page.locator('#photo').getAttribute('src'), /^data:image\/png;base64,/);
      await page.locator('#close-photo').click();
      await page.locator('#motion').selectOption('walk');
      await waitForStudioDraw(page);
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
      await page.goto(origin + mount + '?tab=weapons');
      await page.locator('#weapons-panel').waitFor({state: 'visible'});
      assert.equal(await page.locator('#tab-weapons').getAttribute('aria-selected'), 'true');
      await assertCompactPreview(page);
      await waitForRetry(page, errors, requestFailures);
      assert.equal(await page.locator('#cart-add').isEnabled(), false, 'Cannot add a model before it has loaded');
      await page.locator('#tab-models').click();
      await assertCartCount(page, 0);
      const dobbyCard = page.locator('#model-items [data-model-id="dobby"]');
      await addFromCard(page, dobbyCard, 'Добби', 1);
      assert(await page.locator('#retry-model').isVisible(), 'Adding a model must not start loading it');
      await dobbyCard.locator('.model-pick').click();
      await loadOk(page);
      await assertPurchase(page, 'Добби', /^3 000 ₽ \/ месяц$/);
      assert.equal(await page.locator('#cart-add').isEnabled(), false, 'Selected offer must reflect a direct add');
      await page.locator('#tab-hats').click();
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() => {
        const {top, bottom} = document.getElementById('viewport').getBoundingClientRect();
        return window.scrollY >= 600 && bottom > 0 && top < innerHeight;
      });
      await waitForStudioDraw(page);
      const bunnyCard = page.locator('#items [data-id="bunny"]');
      const hat = await bunnyCard.locator('.item-name').textContent();
      await addFromCard(page, bunnyCard, hat, 2);
      assert.equal(await page.locator('#hat-price').isVisible(), false);
      await bunnyCard.locator('.item-pick').click();
      await page.locator('#purchase-options').waitFor({state: 'visible'});
      await assertPurchase(page, hat, /^\$8 \/ месяц$/);
      assert.equal(await page.locator('#cart-add').isEnabled(), false);
      assert.equal(await page.locator('#hat-price').textContent(), 'Шапка · $8 / месяц');
      await page.locator('[data-product-type="model"]').click();
      await assertPurchase(page, 'Добби', /^3 000 ₽ \/ месяц$/);
      assert.equal(await page.locator('#cart-add').isEnabled(), false, 'Choosing an added product must not enable duplicates');
      await page.locator('[data-product-type="hat"]').click();
      await assertPurchase(page, hat, /^\$8 \/ месяц$/);
      await page.locator('#tab-weapons').click();
      await page.locator('#weapon-filters [data-category="knife"]').click();
      const knifeCard = page.locator('[data-weapon-id="butterfly-knife-doppler-sapphire"]');
      const knife = knifeCard.locator('.item-pick');
      await addFromCard(page, knifeCard, 'Butterfly Knife | Doppler Sapphire', 3);
      assert.equal(await page.locator('#weapon-price').isVisible(), false);
      await knife.click();
      await loadOk(page);
      await assertPurchase(page, 'Butterfly Knife | Doppler Sapphire', /^\$9 \/ месяц$/);
      assert.equal(await page.locator('#cart-add').isEnabled(), false);
      assert(await page.locator('#model-price').isVisible());
      assert(await page.locator('#weapon-price').isVisible());
      const modelBadge = await page.locator('#model-price').boundingBox();
      const weaponBadge = await page.locator('#weapon-price').boundingBox();
      const hatBadge = await page.locator('#hat-price').boundingBox();
      const viewControls = await page.locator('.view-controls').boundingBox();
      assert(modelBadge.x + modelBadge.width <= weaponBadge.x, 'Both prices should fit side by side');
      assert(weaponBadge.y + weaponBadge.height <= viewControls.y, 'Price badges should clear camera controls');
      assert(hatBadge.y + hatBadge.height <= viewControls.y, 'Hat price should clear camera controls');
      await page.locator('#tab-hats').click();
      const knight = page.locator('#items [data-id="knight"] .item-pick');
      assert.equal(await knight.locator('.catalog-item-price').textContent(), '$600 · навсегда');
      await knight.click();
      await loadOk(page);
      await assertPurchase(page, 'Рыцарь', /^\$600 · навсегда$/);
      await addToCart(page, 4);
      assert.equal(await page.locator('#hat-price').textContent(), 'Шапка · $600 · навсегда');
      await page.locator('#remove').click();
      await loadOk(page);
      assert.equal(await page.locator('#hat-price').isVisible(), false);
      await page.locator('#tab-models').click();
      await page.locator('#model-items [data-model-id="p_small_sonic"] .model-pick').click();
      await loadOk(page);
      assert.equal(await knife.getAttribute('aria-pressed'), 'true');
      await page.locator('#tab-weapons').click();
      await page.locator('#remove-weapon').click();
      assert.equal(await knife.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.locator('#weapon-price').isVisible(), false);

      let cart = await openCart(page, '#cart-open-bottom');
      assert.equal(await cart.locator('[data-cart-item]').count(), 4);
      await assertCartTotal(cart, 'RUB:month', /3 000 ₽\s*\/\s*месяц/);
      await assertCartTotal(cart, 'USD:month', /\$17\s*\/\s*месяц/);
      await assertCartTotal(cart, 'USD:lifetime', /\$600.*навсегда/);
      await page.keyboard.press('Escape');
      assert.equal(await cart.isVisible(), false);

      await page.reload();
      await loadOk(page);
      await assertCartCount(page, 4);
      await page.locator('#tab-hats').click();
      await assertCardCartButton(bunnyCard, hat, true);
      cart = await openCart(page, '#cart-open-top');
      assert.equal(await cart.locator('[data-cart-item]').count(), 4);
      await cart.locator('[data-cart-item="hat:bunny"] [data-cart-remove]').click();
      await assertCartCount(page, 3);
      assert.equal(await cart.locator('[data-cart-item="hat:bunny"]').count(), 0);
      await assertCartTotal(cart, 'USD:month', /\$9\s*\/\s*месяц/);
      await assertCheckout(page, ['Добби', 'Butterfly Knife | Doppler Sapphire', 'Рыцарь'], [hat]);
      await page.keyboard.press('Escape');
      await assertCardCartButton(bunnyCard, hat, false);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log('Browser smoke passed: loading recovery, Weapons tab, visibility-aware 3D, and mobile cart checkout.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
