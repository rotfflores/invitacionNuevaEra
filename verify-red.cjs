const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

(async () => {
  const baseline = JSON.parse(readFileSync('.preview/red-gallery-baseline.json', 'utf8'));
  for (const [file, expected] of Object.entries(baseline)) {
    if (file === 'index.html') continue;
    assert.equal(sha256(file), expected, `${file} must remain unchanged`);
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    for (const width of [320, 390, 412, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173');
      await page.click('#open-invitation');
      await page.waitForTimeout(1150);
      await page.locator('#red-memory-archive').evaluate(node => node.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(120);

      const count = await page.locator('.red-memory__polaroid').count();
      assert(count >= 8 && count <= 12, 'gallery accepts 8–12 memories');
      assert.equal(await page.locator('.red-memory__film-button').count(), 4);
      assert.equal(await page.locator('html').evaluate(node => node.scrollWidth <= innerWidth), true, 'no page overflow');
      assert.equal(await page.locator('.red-memory__ribbon').evaluate(node => getComputedStyle(node).pointerEvents), 'none');

      const card = page.locator('.red-memory__polaroid').first();
      await card.focus();
      await card.press('Enter');
      assert(await page.locator('#red-memory-dialog').isVisible());
      assert.equal(await page.locator('#invitation-content').getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator('#red-dialog-counter').textContent(), `01 / ${String(count).padStart(2, '0')}`);
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#red-dialog-counter').textContent(), `02 / ${String(count).padStart(2, '0')}`);
      await page.locator('.red-memory__dialog-figure').evaluate(node => {
        node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 280, clientY: 200 }));
        node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 120, clientY: 205 }));
      });
      assert.equal(await page.locator('#red-dialog-counter').textContent(), `03 / ${String(count).padStart(2, '0')}`);
      await page.keyboard.press('Escape');
      assert(await page.locator('#red-memory-dialog').isHidden());
      assert.equal(await page.locator('#invitation-content').getAttribute('aria-hidden'), null);
      assert.equal(await card.evaluate(node => document.activeElement === node), true, 'focus returns to source memory');

      await page.locator('#red-one-more').click();
      assert.equal(await page.locator('#red-one-more').getAttribute('aria-pressed'), 'true');
      assert(await page.locator('#red-one-more-message').isVisible());

      if (width <= 700) {
        const filmstrip = page.locator('#red-memory-filmstrip');
        assert.equal(await filmstrip.evaluate(node => node.scrollWidth > node.clientWidth), true, 'film strip scrolls on phone');
      }
      console.log(`${width}px: Red gallery, dialog, swipe, keyboard, final card and overflow OK`);
      await page.close();
    }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto('http://127.0.0.1:4173');
    await reduced.click('#open-invitation');
    await reduced.waitForTimeout(50);
    await reduced.locator('#red-memory-archive').evaluate(node => node.scrollIntoView({ block: 'start' }));
    assert.equal(await reduced.locator('.red-memory__polaroid').first().evaluate(node => getComputedStyle(node).animationName), 'none');
    console.log('Reduced motion: Red gallery remains readable without decorative animation');
    await reduced.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
