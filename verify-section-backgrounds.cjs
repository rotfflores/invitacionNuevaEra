const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');

const backgrounds = [
  ['#event-details', '.poets__backdrop', 'ttpd-archive-background.webp'],
  ['#dress-code', '.reputation__backdrop', 'reputation-archive-background.webp'],
  ['#red-memory-archive', '.red-memory__backdrop', 'red-memory-background.webp'],
];

(async () => {
  for (const filename of [...backgrounds.map(item => item[2]), 'red-book-fabric.webp']) {
    assert(existsSync(`assets/${filename}`), `${filename} must exist locally`);
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/');
      await page.locator('#open-invitation').click();
      await page.locator('#invitation-cover').waitFor({ state: 'hidden' });
      await page.locator('#reveal-dress-code').click();
      await page.locator('#red-flip-host').scrollIntoViewIfNeeded();
      await page.locator('#red-memory-archive.is-flip-ready').waitFor();
      for (const [sectionSelector, backdropSelector, filename] of backgrounds) {
        const value = await page.evaluate(({ sectionSelector, backdropSelector }) => {
          const section = document.querySelector(sectionSelector);
          const height = section.getBoundingClientRect().height;
          const top = scrollY + section.getBoundingClientRect().top;
          scrollTo({ top: top + Math.min(height * .4, Math.max(0, height - innerHeight - 60)), behavior: 'instant' });
          return section.querySelector(backdropSelector) !== null;
        }, { sectionSelector, backdropSelector });
        assert(value, `${sectionSelector} has its own backdrop`);
        await page.waitForTimeout(120);
        const result = await page.locator(`${sectionSelector} ${backdropSelector}`).evaluate(node => ({
          top: node.getBoundingClientRect().top,
          position: getComputedStyle(node).position,
          image: getComputedStyle(node).backgroundImage,
          sectionBottom: node.parentElement.getBoundingClientRect().bottom,
          overflow: document.documentElement.scrollWidth - innerWidth,
        }));
        assert.equal(result.position, 'sticky');
        assert(result.image.includes(filename), `${filename} is applied to ${sectionSelector}`);
        assert(Math.abs(result.top) <= 1, `${sectionSelector} image follows scrolling within its section (top ${result.top})`);
        assert(result.sectionBottom > 0, `${sectionSelector} remains in view`);
        assert(result.overflow <= 0, `${sectionSelector} does not widen the page`);
        const response = await page.request.get(`http://127.0.0.1:4173/assets/${filename}`);
        assert.equal(response.status(), 200, `${filename} loads`);
        await page.evaluate(selector => {
          const section = document.querySelector(selector);
          scrollTo({ top: scrollY + section.getBoundingClientRect().bottom + 180, behavior: 'instant' });
        }, sectionSelector);
        const exit = await page.locator(`${sectionSelector} ${backdropSelector}`).evaluate(node => ({
          backdropBottom: node.getBoundingClientRect().bottom,
          sectionBottom: node.parentElement.getBoundingClientRect().bottom,
          overflow: getComputedStyle(node.parentElement).overflowX,
        }));
        assert.equal(exit.overflow, 'clip', `${sectionSelector} clips its backdrop at the section boundary`);
      }
      const fabric = await page.locator('.red-memory__page--cover').evaluate(node => getComputedStyle(node).backgroundImage);
      assert(fabric.includes('red-book-fabric.webp'), 'the supplied woven texture covers the closed book');
      if (width === 390) {
        for (const height of [700, 900]) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await page.waitForTimeout(150);
          const bottom = await page.evaluate(() => {
            const section = document.querySelector('#red-memory-archive');
            const backdrop = section.querySelector('.red-memory__backdrop');
            return {
              viewport: innerHeight,
              backdropHeight: backdrop.getBoundingClientRect().height,
              backdropBottom: backdrop.getBoundingClientRect().bottom,
              sectionBottom: section.getBoundingClientRect().bottom,
              htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
              bodyBackground: getComputedStyle(document.body).backgroundColor,
              sectionBackground: getComputedStyle(section).backgroundColor,
              themeColor: document.querySelector('meta[name="theme-color"]').content,
            };
          });
          assert(Math.abs(bottom.backdropHeight - bottom.viewport) <= 1, 'Red background follows dynamic viewport height');
          assert(bottom.backdropBottom >= bottom.viewport - 1, 'Red image reaches the bottom of the viewport');
          assert(bottom.sectionBottom >= bottom.viewport - 1, 'Red reaches the bottom of the viewport');
          assert.equal(bottom.htmlBackground, 'rgb(75, 23, 25)');
          assert.equal(bottom.bodyBackground, bottom.htmlBackground);
          assert.equal(bottom.sectionBackground, bottom.htmlBackground);
          assert.equal(bottom.themeColor, '#4b1719');
          console.log(`390x${height}: dynamic Red backdrop and bottom browser color OK`);
        }
      }
      assert.deepEqual(errors, []);
      console.log(`${width}px: TTPD, Reputation and Red backgrounds follow their sections; book texture and overflow OK`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
