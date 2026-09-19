const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173');
  await page.click('#open-invitation');
  await page.locator('#dress-code').scrollIntoViewIfNeeded();

  assert(await page.locator('#reveal-dress-code').isVisible());
  assert(await page.locator('#reputation-reveal').getAttribute('inert') !== null);
  await page.click('#reveal-dress-code');
  await page.locator('#reveal-dress-code').waitFor({ state: 'detached' });
  assert(await page.locator('#reputation-reveal').isVisible());
  assert.equal(await page.locator('#reputation-reveal').getAttribute('inert'), null);
  assert.equal(await page.locator('#reveal-dress-code').count(), 0);

  await page.locator('.reputation__swatch').nth(2).click();
  assert.match(await page.locator('#palette-description').textContent(), /DEEP RED/);
  assert.equal(await page.locator('.reputation__swatch').nth(2).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.reputation__look').count(), 3);
  for (const image of await page.locator('.reputation__look img').all()) {
    assert(await image.evaluate(img => img.complete && img.naturalWidth > 0));
  }
  assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true);
  const track = page.locator('.reputation__look-track');
  assert.equal(await track.evaluate(el => el.scrollWidth > el.clientWidth), true);
  assert.equal(await page.getByText(/(?:LOOK|FILE|EDIT) 0[1-9]/).count(), 0);

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto('http://127.0.0.1:4173');
  await desktop.click('#open-invitation');
  await desktop.locator('#dress-code').scrollIntoViewIfNeeded();
  const columns = await desktop.locator('.reputation__look-track').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 3);
  assert.equal(await desktop.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true);

  assert.deepEqual(errors, []);
  console.log('Reputation: reveal, palette, responsive carousel/grid, imagery and overflow OK');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
