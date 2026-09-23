const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  mkdirSync('.preview', { recursive: true });
  try {
    for (const [width, height] of [[390, 844], [430, 932], [1024, 768], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()); });
      await page.goto('http://127.0.0.1:4173/');
      await page.locator('#open-invitation').click();
      await page.locator('#invitation-cover').waitFor({ state: 'hidden' });
      await page.locator('#red-flip-host').scrollIntoViewIfNeeded();
      await page.locator('#red-memory-archive.is-flip-ready').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('.red-memory__page--cover').getBoundingClientRect().width > 0);
      const initial = await page.evaluate(() => ({
        st: !!window.St?.PageFlip,
        pages: document.querySelectorAll('#red-flip-host .red-memory__page').length,
        hard: document.querySelectorAll('#red-flip-host [data-density="hard"]').length,
        counter: document.querySelector('#red-flip-counter').textContent,
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      assert(initial.st && initial.pages >= 15 && initial.hard === 3, JSON.stringify(initial));
      assert.equal(initial.counter, 'Portada');
      assert(initial.overflow <= 1, JSON.stringify(initial));
      if (width === 390) assert(await page.evaluate(() => document.querySelector('.red-memory__page--cover small').getBoundingClientRect().bottom + 10 < document.querySelector('.red-memory__cover-open').getBoundingClientRect().top), 'cover text clears the open button');
      if (width === 390 || width === 1440) await page.locator('#red-flip-host').screenshot({ path: `.preview/red-book-cover-${width}.png` });
      await page.locator('.red-memory__cover-open').first().click();
      await page.waitForFunction(() => document.querySelector('#red-flip-counter').textContent.includes('Página'), { timeout: 3000 });
      const opened = await page.locator('#red-flip-counter').textContent();
      assert(opened.includes('Página'), `cover did not open: ${opened}`);
      if (width === 390) assert(await page.evaluate(() => document.querySelector('.red-memory__intro-ornament').getBoundingClientRect().bottom < document.querySelector('.red-memory__page--intro h3').getBoundingClientRect().top), 'intro decoration clears the heading');
      if (width === 390 || width === 1440) await page.locator('#red-flip-host').screenshot({ path: `.preview/red-book-open-${width}.png` });
      const orientation = await page.locator('#red-flip-host').getAttribute('data-orientation');
      assert.equal(orientation, 'landscape', 'the open-book spread is kept on every screen');
      if (width === 390) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(950);
        assert((await page.locator('#red-flip-counter').textContent()).includes('02'), 'right arrow advances');
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(950);
        assert.equal(await page.locator('#red-flip-counter').textContent(), opened, 'left arrow returns');
      }
      await page.locator('#red-flip-next').click();
      await page.waitForTimeout(1100);
      assert((await page.locator('#red-flip-counter').textContent()).includes('Página'));
      const photo = page.locator('#red-flip-host .red-memory__page-polaroid:visible').first();
      assert.equal(await photo.locator('img').evaluate(node => getComputedStyle(node).objectFit), 'cover');
      await photo.click();
      assert(await page.locator('#red-memory-dialog').isVisible(), 'photo opens full-screen viewer');
      assert.equal(await page.locator('#red-dialog-image').evaluate(node => getComputedStyle(node).objectFit), 'contain');
      await page.locator('.red-memory__dialog-close').click();
      assert(await page.locator('#red-memory-dialog').isHidden(), 'viewer closes');
      await page.locator('#red-flip-host').scrollIntoViewIfNeeded();
      const beforeDrag = await page.locator('#red-flip-counter').textContent();
      const box = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .red-memory__page.--right')]
        .filter(node => getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0)
        .map(node => node.getBoundingClientRect().toJSON()).sort((a, b) => b.right - a.right)[0]);
      const x = box.right - 14, y = box.bottom - 14;
      if (width < 700) {
        const cdp = await page.context().newCDPSession(page);
        const touch = (type, tx, ty) => cdp.send('Input.dispatchTouchEvent', {
          type, touchPoints: type === 'touchEnd' ? [] : [{ x: tx, y: ty, id: 1 }],
        });
        await touch('touchStart', x, y);
        await page.waitForTimeout(120);
        await touch('touchMove', x - 48, y - 18);
        const firstState = await page.locator('#red-flip-host').getAttribute('data-flip-state');
        const first = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .stf__item')].map(node => node.getAttribute('style')).join('|'));
        await touch('touchMove', x - 100, y - 34);
        const secondState = await page.locator('#red-flip-host').getAttribute('data-flip-state');
        const second = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .stf__item')].map(node => node.getAttribute('style')).join('|'));
        assert.equal(firstState, 'user_fold', 'touch drag enters continuous fold state');
        assert.equal(secondState, 'user_fold');
        assert.notEqual(first, second, 'page geometry updates as the finger moves');
        await touch('touchEnd', x - 100, y - 34);
        await page.waitForTimeout(950);
        assert.equal(await page.locator('#red-flip-counter').textContent(), beforeDrag, 'incomplete touch returns to the current page');
        assert(await page.locator('#red-memory-dialog').isHidden(), 'drag does not open viewer');
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 48, y - 18, { steps: 5 });
        const firstState = await page.locator('#red-flip-host').getAttribute('data-flip-state');
        const first = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .stf__item')].map(node => node.getAttribute('style')).join('|'));
        await page.mouse.move(x - 100, y - 34, { steps: 5 });
        const secondState = await page.locator('#red-flip-host').getAttribute('data-flip-state');
        const second = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .stf__item')].map(node => node.getAttribute('style')).join('|'));
        const shadow = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host [class*="Shadow"]')].map(node => ({ display: getComputedStyle(node).display, opacity: getComputedStyle(node).opacity })).filter(item => item.display !== 'none'));
        assert.equal(firstState, 'user_fold', 'mouse drag enters continuous fold state');
        assert.equal(secondState, 'user_fold');
        assert.notEqual(first, second, 'page geometry updates while the mouse moves');
        assert(shadow.length > 0, 'StPageFlip draws a fold shadow');
        await page.mouse.up();
        await page.waitForTimeout(950);
        assert.equal(await page.locator('#red-flip-counter').textContent(), beforeDrag, 'incomplete drag returns to the current page');
      }
      if (width < 700) {
        await page.setViewportSize({ width: height, height: width });
        await page.waitForTimeout(350);
        assert.equal(await page.locator('#red-flip-host .stf__wrapper').count(), 1, 'rotation keeps one PageFlip instance');
        assert((await page.locator('#red-flip-counter').textContent()).includes('02'), 'rotation keeps the current page visible in the spread');
        assert.equal(await page.locator('#red-flip-host').getAttribute('data-orientation'), 'landscape');
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(350);
        assert.equal(await page.locator('#red-flip-counter').textContent(), beforeDrag, 'return rotation keeps the current page');
        assert.equal(await page.locator('#red-flip-host').getAttribute('data-orientation'), 'landscape');
      }
      await page.locator('#red-flip-prev').click();
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('#red-flip-counter').textContent(), opened, 'previous button returns to the prior page or spread');
      if (width === 390 || width === 1440) {
        const turningPage = await page.evaluate(() => [...document.querySelectorAll('#red-flip-host .red-memory__page.--right')]
          .filter(node => getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0)
          .map(node => node.getBoundingClientRect().toJSON()).sort((a, b) => b.right - a.right)[0]);
        const fromX = turningPage.right - 12, fromY = turningPage.bottom - 12;
        const toX = turningPage.left - 70;
        if (width === 390) {
          const cdp = await page.context().newCDPSession(page);
          const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 2 }] });
          await send('touchStart', fromX, fromY);
          await page.waitForTimeout(120);
          for (const fraction of [.25, .5, .75, 1]) await send('touchMove', fromX + (toX - fromX) * fraction, fromY - 16);
          await send('touchEnd', toX, fromY - 16);
        } else {
          await page.mouse.move(fromX, fromY);
          await page.mouse.down();
          await page.mouse.move(toX, fromY - 16, { steps: 14 });
          await page.mouse.up();
        }
        await page.waitForTimeout(1050);
        assert.notEqual(await page.locator('#red-flip-counter').textContent(), opened, 'completed drag turns the page');
        assert(await page.locator('#red-memory-dialog').isHidden(), 'completed drag does not open a photo');
      }
      if (width === 390) {
        const startY = await page.evaluate(() => scrollY);
        await page.mouse.move(3, height / 2);
        await page.mouse.wheel(0, 320);
        await page.waitForTimeout(180);
        assert((await page.evaluate(() => scrollY)) > startY, 'vertical scrolling outside the book remains available');
        for (let turn = 0; turn < 12 && !(await page.locator('#red-flip-counter').textContent()).includes('Página 12'); turn++) {
          await page.locator('#red-flip-next').click();
          await page.waitForTimeout(900);
        }
        assert((await page.locator('#red-flip-counter').textContent()).includes('12'), 'secret page is reached');
        await page.locator('#red-flip-host').screenshot({ path: '.preview/red-book-secret-closed-390.png' });
        await page.locator('.red-memory__envelope:visible').click();
        assert(await page.locator('.red-memory__page--secret.is-revealed:visible').isVisible(), 'the number 13 envelope opens');
        assert(await page.locator('.red-memory__secret-reveal .red-memory__page-note:visible').isVisible(), 'secret message appears');
        assert(await page.evaluate(() => {
          const secret = document.querySelector('.red-memory__page--secret');
          return secret.querySelector('.red-memory__secret-reveal .red-memory__page-note').getBoundingClientRect().bottom + 6 < secret.querySelector('.red-memory__page-footer').getBoundingClientRect().top;
        }), 'secret message clears the footer');
        await page.locator('#red-flip-host').screenshot({ path: '.preview/red-book-secret-open-390.png' });
        await page.locator('#red-flip-next').click();
        await page.waitForTimeout(900);
        assert(await page.locator('#red-flip-close').isVisible(), 'close-book button appears at the end');
        await page.locator('#red-flip-close').click();
        await page.waitForTimeout(900);
        assert.equal(await page.locator('#red-flip-counter').textContent(), 'Contraportada');
      }
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: cover, drag, viewer, controls, rotation and overflow OK; ${opened}`);
      await page.close();
    }
    const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await fallback.goto('http://127.0.0.1:4173/');
    assert(await fallback.locator('#red-memory-grid img').count() >= 8, 'photos remain in static HTML without JavaScript');
    assert(await fallback.locator('#red-memory-archive').isVisible(), 'Red remains accessible without JavaScript');
    await fallback.close();
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto('http://127.0.0.1:4173/');
    await reduced.locator('#open-invitation').click();
    await reduced.locator('#red-flip-host').scrollIntoViewIfNeeded();
    await reduced.locator('#red-memory-archive.is-flip-ready').waitFor();
    await reduced.locator('.red-memory__cover-open').click();
    await reduced.waitForFunction(() => document.querySelector('#red-flip-counter').textContent.includes('Página'));
    assert(await reduced.locator('#red-flip-next').isEnabled(), 'reduced motion keeps explicit navigation');
    await reduced.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
