const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  for (const timezoneId of ['America/Mexico_City', 'Asia/Tokyo']) {
    const page = await browser.newPage({ timezoneId, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-12-14T00:59:55Z') });
    await page.clock.pauseAt(new Date('2026-12-14T00:59:55Z'));
    await page.goto('http://127.0.0.1:4173');
    await page.click('#open-invitation');
    await page.locator('#invitation-cover').waitFor({ state: 'hidden' });
    await page.click('.midnights__discover');
    await page.waitForFunction(() => document.querySelector('#event-details').classList.contains('is-revealed'));
    assert.equal(await page.locator('#countdown-seconds').textContent(), '05');
    assert.match(await page.locator('#event-date').textContent(), /13 de diciembre de 2026/);
    assert.match(await page.locator('#event-hour').textContent(), /07:00/);
    await page.clock.runFor(2000);
    assert.equal(await page.locator('#countdown-seconds').textContent(), '03');
    await page.clock.runFor(3000);
    assert(await page.locator('#chapter-begun').isVisible());
    assert(await page.locator('#event-clock').isHidden());
    const href = await page.locator('#event-map').getAttribute('href');
    const url = new URL(href);
    assert.equal(url.hostname, 'www.google.com');
    assert.match(url.searchParams.get('query'), /Parque México, Avenida México s\/n/);
    // Check new-tab navigation without making this test depend on Google's UI/network.
    await page.context().route('https://www.google.com/maps/**', route => route.fulfill({ body: 'Maps navigation verified' }));
    const popupPromise = page.waitForEvent('popup');
    await page.click('#event-map');
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), href);
    await popup.close();
    assert.equal(await page.locator('.poets__paper video, .poets__paper canvas').count(), 0);
    assert(await page.locator('#alison-photo').isVisible());
    assert(await page.locator('#alison-photo').evaluate(img => img.complete && img.naturalWidth > 0));
    assert(await page.locator('#alison-photo-placeholder').isHidden());
    assert(await page.locator('.poets__flower').evaluate(img => img.complete && img.naturalWidth > 0));
    console.log(`${timezoneId}: countdown, zero state, local event time, new-tab Maps target OK`);
    await page.close();
  }
  const page = await browser.newPage();
  await page.route('**/event-config.js*', route => route.fulfill({ contentType: 'text/javascript', body: `window.EVENT_DETAILS = { startsAt: '2026-12-13T19:00:00-05:00', timeZone: 'America/Mexico_City' };` }));
  await page.goto('http://127.0.0.1:4173');
  assert.equal(await page.locator('#countdown-days').textContent(), '--');
  assert.equal(await page.locator('#event-map').getAttribute('href'), null);
  console.log('Mismatched time zone and missing address: safe pending state OK');
  assert.deepEqual(errors, []);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
