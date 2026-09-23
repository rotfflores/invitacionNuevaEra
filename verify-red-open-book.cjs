// Red memory book: open-book spread (previous page left, current page right).
// Run with the local server on 127.0.0.1:4173. PW_CHANNEL overrides the browser channel.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');

const channel = process.env.PW_CHANNEL ?? 'msedge';
const turnTime = 1150;

const snapshot = page => page.evaluate(() => {
  const host = document.querySelector('#red-flip-host');
  const visible = [...host.querySelectorAll('.red-memory__page')].filter(node => {
    const rect = node.getBoundingClientRect();
    return getComputedStyle(node).display !== 'none' && rect.width > 20 && rect.height > 20;
  }).map(node => {
    const rect = node.getBoundingClientRect();
    return { kind: [...node.classList].find(name => /--(cover|back|endpaper|intro|photo-|secret|farewell)/.test(name)),
      verso: node.classList.contains('red-memory__page--verso'), left: rect.left, right: rect.right, width: rect.width, height: rect.height, top: rect.top };
  }).sort((a, b) => a.left - b.left);
  const hostRect = host.getBoundingClientRect();
  const rightPage = host.querySelector('.red-memory__page.--right');
  const fold = rightPage && getComputedStyle(rightPage).display !== 'none' ? rightPage.getBoundingClientRect().left : null;
  const controls = document.querySelector('.red-memory__flip-controls').getBoundingClientRect();
  return { visible, state: host.dataset.bookState, counter: document.querySelector('#red-flip-counter').textContent,
    host: { left: hostRect.left, width: hostRect.width, height: hostRect.height, top: hostRect.top },
    spine: { center: fold },
    controlsTop: controls.top - hostRect.top, viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth };
});

// Every printed element stays inside its page and does not sit on top of another one.
const layoutProblems = page => page.evaluate(() => {
  const selectors = 'h3, .red-memory__page-inner > p, .red-memory__page--cover small, .red-memory__page-topline, .red-memory__page-footer, .red-memory__page-hand, .red-memory__intro-ornament, .red-memory__cover-kicker, .red-memory__cover-rule, .red-memory__cover-open, .red-memory__cover-number, .red-memory__page-polaroid, .red-memory__page-note, .red-memory__page-film, .red-memory__envelope, .red-memory__secret-number, .red-memory__back-mark, .red-memory__back-number';
  const problems = [];
  const pages = [...document.querySelectorAll('#red-flip-host .red-memory__page')].filter(node => getComputedStyle(node).display !== 'none'
    && !node.style.clipPath && node.getBoundingClientRect().width > 20);
  for (const pageNode of pages) {
    const box = pageNode.getBoundingClientRect();
    const name = [...pageNode.classList].find(c => /--(cover|back|intro|photo-|secret|farewell)/.test(c)) || 'page';
    const items = [...pageNode.querySelectorAll(selectors)].filter(node => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.parentElement.closest('.red-memory__page-polaroid, .red-memory__page-film');
    });
    for (const node of items) {
      const r = node.getBoundingClientRect();
      if (r.left < box.left + 4 || r.right > box.right - 4 || r.top < box.top + 4 || r.bottom > box.bottom - 4)
        problems.push(`${name}: ${node.className || node.tagName} leaves the page`);
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.classList.contains('red-memory__page-polaroid') && b.classList.contains('red-memory__page-polaroid')) continue; // the small print is tucked on purpose
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 3 && h > 3) problems.push(`${name}: ${a.className || a.tagName} overlaps ${b.className || b.tagName} (${Math.round(h)}px)`);
    }
  }
  return problems;
});

async function touchDrag(page, from, to, steps = 12) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ x: point.x, y: point.y, id: 1 }] : [] });
  await send('touchStart', from);
  await page.waitForTimeout(150);
  const states = [];
  for (let i = 1; i <= steps; i++) {
    const point = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps };
    await send('touchMove', point);
    await page.waitForTimeout(16);
    states.push(await page.evaluate(() => document.querySelector('#red-flip-host').dataset.flipState));
  }
  await send('touchEnd');
  await cdp.detach();
  return states;
}

(async () => {
  const browser = await chromium.launch(channel ? { channel } : {});
  mkdirSync('.preview', { recursive: true });
  try {
    for (const [width, height] of [[390, 844], [375, 667], [360, 740], [320, 568], [430, 932], [844, 390], [768, 1024], [1024, 768], [1440, 900]]) {
      const phone = width < 700;
      const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/');
      await page.locator('#open-invitation').click();
      await page.locator('#invitation-cover').waitFor({ state: 'hidden' });
      await page.locator('#red-flip-host').scrollIntoViewIfNeeded();
      await page.locator('#red-memory-archive.is-flip-ready').waitFor({ timeout: 10000 });
      await page.locator('#red-flip-host').evaluate(node => node.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(700);

      // Closed: only the cover, centered.
      let s = await snapshot(page);
      assert.equal(s.counter, 'Portada');
      assert.equal(s.visible.length, 1, `closed book shows one page: ${JSON.stringify(s.visible)}`);
      const coverCenter = (s.visible[0].left + s.visible[0].right) / 2;
      assert(Math.abs(coverCenter - width / 2) < 24, `cover centered: ${coverCenter}`);
      assert(s.overflow <= 1, 'no horizontal scroll (cover)');
      assert.deepEqual(await layoutProblems(page), [], 'cover layout');
      await page.screenshot({ path: `.preview/red-open-book-cover-${width}.png` });
      const heightClosed = s.host.height;
      const controlsClosed = s.controlsTop;

      // Open with the cover button.
      await page.locator('.red-memory__cover-open').click();
      await page.waitForFunction(() => document.querySelector('#red-flip-counter').textContent.includes('Página 01'));
      await page.waitForTimeout(800);
      s = await snapshot(page);
      assert.equal(s.state, 'open');
      assert.equal(s.visible.length, 2, `open spread shows two pages: ${JSON.stringify(s.visible)}`);
      const [left, right] = s.visible;
      assert.equal(left.kind, 'red-memory__page--endpaper');
      assert.equal(right.kind, 'red-memory__page--intro');
      assert(Math.abs(left.right - right.left) < 2, 'pages meet at the spine');
      assert(await page.evaluate(() => getComputedStyle(document.querySelector('#red-flip-host .red-memory__page--intro'), '::before').backgroundImage.includes('gradient')), 'fold shading is painted on the page');
      assert.equal(s.host.height, heightClosed, 'book height does not change when opening');
      assert.equal(s.controlsTop, controlsClosed, 'controls stay in place');
      const layout = await page.locator('.red-memory__flip-experience').getAttribute('data-book-layout');
      assert.equal(layout, phone ? 'peek' : 'spread', 'phones peek, wider screens show the full spread');
      if (phone) {
        const seen = Math.max(0, left.right) - Math.max(0, left.left);
        const fraction = seen / left.width;
        assert(fraction >= .2 && fraction <= .35, `left page visible fraction ${fraction.toFixed(2)}`);
        assert(right.left >= 0 && right.right <= width, 'current page fully on screen');
        assert(right.width >= width * .7, `current page stays large: ${right.width}`);
      } else {
        assert(left.left >= 0 && right.right <= width, 'both pages fully visible on tablet/desktop');
        assert(Math.abs((left.left + right.right) / 2 - width / 2) < 24, 'spread centered');
      }
      assert(s.overflow <= 1, 'no horizontal scroll (open)');
      assert.deepEqual(await layoutProblems(page), [], 'intro layout');
      const anchor = { host: s.host.left, spine: s.spine.center, controls: s.controlsTop };

      // Forward with the button: the page just read settles on the left.
      for (const expected of ['02', '03', '04']) {
        const before = (await snapshot(page)).visible.at(-1).kind;
        await page.locator('#red-flip-next').click();
        await page.waitForTimeout(turnTime);
        s = await snapshot(page);
        assert(s.counter.includes(`Página ${expected} / 13`), s.counter);
        assert.equal(s.visible.length, 2);
        assert.equal(s.visible[0].kind, before, 'previous page remains on the left');
        assert(s.visible[0].verso && !s.visible[1].verso);
        assert.equal(s.host.left, anchor.host, 'book does not jump between turns');
        assert.equal(s.spine.center, anchor.spine, 'spine is stable');
        assert.equal(s.controlsTop, anchor.controls, 'controls are stable');
        assert(s.overflow <= 1);
      }
      if (width === 390 || width === 1440) await page.screenshot({ path: `.preview/red-open-book-spread-${width}.png` });

      // Drag forward from the right edge: the leaf follows the pointer, then lands on the left.
      const box = s.visible[1];
      const y = s.host.top + s.host.height * .72;
      const before = box.kind;
      let states;
      if (phone) states = await touchDrag(page, { x: box.right - 12, y }, { x: Math.max(4, box.left - 60), y: y - 20 });
      else {
        await page.mouse.move(box.right - 10, y);
        await page.mouse.down();
        states = [];
        for (let i = 1; i <= 12; i++) {
          await page.mouse.move(box.right - 10 - (box.width + 60) * i / 12, y - 2 * i);
          states.push(await page.evaluate(() => document.querySelector('#red-flip-host').dataset.flipState));
          if (i === 6 && width === 1440) await page.screenshot({ path: `.preview/red-open-book-drag-${width}.png` });
        }
        await page.mouse.up();
      }
      assert(states.includes('user_fold'), `leaf follows the pointer: ${states}`);
      await page.waitForTimeout(turnTime);
      s = await snapshot(page);
      assert(s.counter.includes('Página 05'), `drag forward turned the page: ${s.counter}`);
      assert.equal(s.visible[0].kind, before, 'dragged page settles on the left');
      assert.equal(s.host.left, anchor.host);

      // Drag back from the left page: it crosses to the right as the current page.
      const leftPage = s.visible[0];
      const grab = { x: Math.max(8, leftPage.left + 12), y };
      if (process.env.DEBUG) console.log(await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return [e.tagName, e.className, innerHeight]; }, [grab.x, grab.y]), grab, leftPage);
      if (phone) states = await touchDrag(page, grab, { x: width - 20, y: y - 20 });
      else {
        await page.mouse.move(grab.x, y);
        await page.mouse.down();
        states = [];
        for (let i = 1; i <= 12; i++) {
          await page.mouse.move(grab.x + (width * .55) * i / 12, y - 2 * i);
          states.push(await page.evaluate(() => document.querySelector('#red-flip-host').dataset.flipState));
        }
        await page.mouse.up();
      }
      assert(states.includes('user_fold'), `left page follows the pointer back: ${states}`);
      await page.waitForTimeout(turnTime);
      s = await snapshot(page);
      assert(s.counter.includes('Página 04'), `drag back returned: ${s.counter}`);
      assert.equal(s.visible[1].kind, leftPage.kind, 'returned page is current on the right');
      assert.equal(s.host.left, anchor.host);

      // Keyboard.
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(turnTime);
      assert((await snapshot(page)).counter.includes('Página 03'), 'left arrow');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(turnTime);
      assert((await snapshot(page)).counter.includes('Página 04'), 'right arrow');

      // Photos still open in the viewer, from either page.
      await page.locator('#red-flip-host .red-memory__page-polaroid:visible').last().click();
      assert(await page.locator('#red-memory-dialog').isVisible(), 'photo viewer opens');
      await page.locator('.red-memory__dialog-close').click();
      await page.locator('#red-flip-host').evaluate(node => node.scrollIntoView({ block: 'center' }));

      // To the end: the book closes on the back cover.
      for (let i = 0; i < 20 && !(await page.locator('#red-flip-next').isDisabled()); i++) {
        await page.locator('#red-flip-next').click();
        await page.waitForTimeout(turnTime);
        const step = await snapshot(page);
        if (step.state === 'open') {
          assert.deepEqual(await layoutProblems(page), [], `layout at ${step.counter}`);
          assert.equal(step.visible.length, 2);
          assert.equal(step.host.left, anchor.host);
        }
        if (step.counter.includes('Página 12')) {
          await page.locator('.red-memory__envelope:visible').last().click();
          assert.equal(await page.locator('.red-memory__page--secret.is-revealed').count(), 2, 'secret reveal stays in sync on both sides');
          await page.waitForTimeout(450);
          assert.deepEqual(await layoutProblems(page), [], 'revealed secret layout');
        }
      }
      s = await snapshot(page);
      assert.equal(s.counter, 'Contraportada');
      assert.equal(s.visible.length, 1, 'closed at the back cover');
      assert.equal(s.visible[0].kind, 'red-memory__page--back');
      assert.deepEqual(await layoutProblems(page), [], 'back cover layout');
      assert(Math.abs((s.visible[0].left + s.visible[0].right) / 2 - width / 2) < 24, 'back cover centered');
      assert(s.overflow <= 1);
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: cover centered, open spread kept after every turn, drag both ways, closes on back cover`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
