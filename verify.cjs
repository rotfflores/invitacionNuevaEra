// Browser smoke checks. Requires Playwright; set NODE_PATH to its installation.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  fs.mkdirSync('.preview', { recursive: true });
  for (const [name, width, height, reducedMotion] of [
    ['phone', 390, 844, 'no-preference'],
    ['small-phone', 320, 568, 'no-preference'],
    ['android', 412, 915, 'no-preference'],
    ['landscape', 844, 390, 'no-preference'],
    ['desktop', 1440, 900, 'no-preference'],
    ['reduced', 390, 844, 'reduce'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.waitForTimeout(2100);
    const state = await page.evaluate(() => {
      const v = document.querySelector('video');
      const b = document.querySelector('#open-invitation').getBoundingClientRect();
      return {
        muted: v.muted && v.defaultMuted,
        playing: !v.paused && v.currentTime > 0,
        inline: v.playsInline,
        controls: v.controls,
        overflow: document.documentElement.scrollWidth > innerWidth,
        buttonVisible: b.top >= 0 && b.bottom < innerHeight && b.left >= 0 && b.right <= innerWidth,
        locked: getComputedStyle(document.body).overflowY === 'hidden',
        details: !!document.querySelector('#event-details .poets__paper'),
      };
    });
    assert(state.muted && state.inline && !state.controls && !state.overflow && state.buttonVisible && state.locked && state.details, JSON.stringify(state));
    assert.equal(state.playing, reducedMotion !== 'reduce');
    assert(await page.locator('#midnights-video').evaluate(v => v.paused && !v.currentSrc));
    assert(await page.locator('#midnights-blur').evaluate(v => v.paused && !v.currentSrc));
    assert.equal(await page.locator('#era-title').textContent(), 'ALISON’S ERA');
    await page.click('#sound-toggle');
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => {
      const v = document.querySelector('video');
      return !v.muted && !v.paused && document.querySelector('#sound-toggle').getAttribute('aria-pressed') === 'true';
    }));
    if (reducedMotion === 'reduce') {
      assert.equal(await page.locator('#cover-video').evaluate(v => getComputedStyle(v).opacity), '0');
    }
    await page.click('#sound-toggle');
    assert(await page.locator('#cover-video').evaluate(v => v.muted));
    await page.click('#sound-toggle');
    await page.screenshot({ path: `.preview/${name}.png` });
    await page.click('#open-invitation');
    await page.waitForTimeout(1150);
    assert(await page.evaluate(() => {
      const main = document.querySelector('main');
      return document.querySelector('#invitation-cover').hidden && !main.hidden &&
        document.querySelector('video').paused && document.activeElement === main &&
        !document.body.classList.contains('cover-open') && getComputedStyle(document.body).overflowY !== 'hidden';
    }));
    assert.deepEqual(errors, []);
    await page.waitForTimeout(2100);
    assert(await page.locator('#midnights-video').evaluate((v, reduced) =>
      v.muted && !v.controls && v.playsInline && v.paused === reduced, reducedMotion === 'reduce'));
    assert(await page.locator('#midnights-blur').evaluate((v, play) =>
      v.muted && v.paused !== play, width >= height && reducedMotion !== 'reduce'));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `.preview/midnights-${name}.png` });
    await page.click('.midnights__discover');
    await page.waitForTimeout(1300);
    assert(await page.locator('#midnights-video').evaluate(v => v.paused));
    assert(await page.locator('#midnights-blur').evaluate(v => v.paused));
    await page.locator('.poets__paper').screenshot({ path: `.preview/poets-${name}.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#midnights-video').evaluate(v => !v.paused), reducedMotion !== 'reduce');
    console.log(`${name}: Midnights delayed playback, silent video, scroll pause/resume OK`);
    console.log(`${name}: layout, video, silence, scroll lock, transition, focus OK`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/*.mp4', route => route.abort());
  await page.goto('http://127.0.0.1:4173');
  await page.waitForTimeout(1900);
  await page.click('#open-invitation');
  await page.waitForTimeout(1150);
  assert(await page.locator('#invitation-content').isVisible());
  console.log('Unavailable video: poster fallback and opening OK');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

