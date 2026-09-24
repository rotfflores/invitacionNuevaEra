const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 for(const width of [390,430,1024,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},permissions:['clipboard-read','clipboard-write'],reducedMotion:width===430?'reduce':'no-preference'});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.open=(url)=>{window.__whatsapp=url;return {}}});
  if(width===390) await page.route('**/speak-now-config.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('speak-now-config.js','utf8').replace('maxGuests: 1','maxGuests: 3')}));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#open-invitation').click();await page.locator('#speak-now-rsvp').scrollIntoViewIfNeeded();
  assert(await page.locator('#speak-form').isHidden());
  const closed=await page.locator('#speak-now-rsvp').evaluate(n=>n.offsetHeight);assert(closed<844);
  if(width===390) await page.locator('#speak-now-rsvp').screenshot({path:'.preview/speak-closed.png'});
  await page.locator('[data-open=button]').click();await page.waitForTimeout(1900);
  assert.equal(await page.locator('.speak-rsvp__stage').getAttribute('aria-expanded'),'true');
  await page.locator('#speak-form [type=submit]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'speak-name');
  await page.locator('#speak-name').fill('Ana María & José');await page.locator('#speak-form [type=submit]').click();assert.equal(await page.evaluate(()=>document.activeElement.name),'attendance');
  await page.locator('[name=attendance][value=yes]').check();
  if(width===390) {for(let i=0;i<2;i++)await page.locator('[data-count=plus]').click();assert.equal(await page.locator('#speak-count').textContent(),'3');assert(await page.locator('[data-count=plus]').isDisabled());}
  else assert(await page.locator('[data-count=plus]').isHidden());
  await page.locator('#speak-message').fill('¡Nos vemos! 💜');await page.locator('#speak-song').fill('Enchanted & Long Live');
  await page.locator('#speak-form [type=submit]').click();
  const url=await page.evaluate(()=>window.__whatsapp);const parsed=new URL(url);assert.equal(parsed.hostname,'wa.me');assert.equal(parsed.pathname,'/526182051723');const text=parsed.searchParams.get('text');
  assert(text.includes('Ana María & José'));assert(text.includes('Enchanted & Long Live'));assert(text.includes('¡Nos vemos! 💜'));
  assert(await page.locator('#speak-form').isHidden());assert(await page.locator('.speak-rsvp__return').isVisible());
  assert((await page.locator('.speak-rsvp__thanks').textContent()).includes('Gracias'));assert(await page.locator('[data-view]').isVisible());assert(await page.locator('[data-change]').isVisible());
  await page.locator('[data-view]').click();assert.equal((await page.locator('.speak-rsvp__preview').textContent()).replace(/\r\n/g,'\n'),text);
  await page.locator('[data-change]').click();await page.waitForTimeout(1900);assert(await page.locator('#speak-form').isVisible());
  await page.locator('[data-copy]').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),text);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speak-now-rsvp:cumpleaños de Alison')));assert.deepEqual(Object.keys(saved).sort(),['choice','completed','name']);
  if(width===390||width===1440) await page.locator('#speak-now-rsvp').screenshot({path:`.preview/speak-open-${width}.png`});
  await page.locator('[value=no][name=attendance]').check();assert(await page.locator('.speak-rsvp__guests').isHidden());
  await page.locator('#speak-message').fill('');await page.locator('#speak-form [type=submit]').click();const noText=new URL(await page.evaluate(()=>window.__whatsapp)).searchParams.get('text');assert(await page.locator('#speak-form').isHidden());assert((await page.locator('.speak-rsvp__thanks').textContent()).includes('Gracias por avisarnos'));
  assert(!/Canción|Mensaje:|asistentes:|undefined|null/.test(noText));assert(noText.includes('no podré asistir'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.reload();await page.locator('#open-invitation').click();await page.locator('#speak-now-rsvp').scrollIntoViewIfNeeded();assert(await page.locator('.speak-rsvp__return').isVisible());
  await page.locator('[data-view]').click();assert((await page.locator('.speak-rsvp__preview').textContent()).includes('Solo se guardaron'));
  await page.locator('[data-change]').click();await page.waitForTimeout(1900);assert.equal(await page.locator('#speak-name').inputValue(),'Ana María & José');
  assert.deepEqual(errors,[]);console.log(`${width}px: closed ${closed}px; validation, limits, WhatsApp, copy, return, overflow OK`);await context.close();
 }
 const before=fs.readFileSync('.preview/before-speak.html','utf8'),after=fs.readFileSync('index.html','utf8');
 assert.equal(before.slice(before.indexOf('<body'),before.indexOf('    </main>')),after.slice(after.indexOf('<body'),after.indexOf('      <section class="speak-rsvp"')),'prior HTML unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
