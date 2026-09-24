const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 for(const full of [false,true]) for(const width of [390,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:932},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  if(full) await page.route('**/lover-gifts-config.js',route=>route.fulfill({contentType:'application/javascript',body:"window.LOVER_GIFTS={presence:{enabled:true},registry:{enabled:true,url:'https://example.com/gifts'},digital:{enabled:true,holder:'Alison',bank:'Banco de prueba',account:'123456789012345678'}};"}));
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#open-invitation').click();
  if (!full && width === 390) {
   await page.locator('#red-flip-host').scrollIntoViewIfNeeded();
   await page.locator('#red-memory-archive.is-flip-ready').waitFor();
   await page.locator('.red-memory__cover-open').first().click();
   await page.waitForFunction(()=>document.querySelector('#red-flip-host').dataset.bookState === 'open');
   await page.waitForTimeout(1000);
   await page.locator('#red-flip-next').click();
   await page.waitForTimeout(1200);
   assert(await page.locator('#red-flip-host .red-memory__page--photo-feature.--right').isVisible());
   await page.locator('#red-flip-prev').click();
   await page.waitForTimeout(1200);
   assert(await page.locator('#red-flip-host .red-memory__page--intro.--right').isVisible());
  }
  await page.locator('#lover-gifts').scrollIntoViewIfNeeded();
  const box=page.locator('.lover-gifts__toggle');
  const closed=await page.locator('#lover-gifts').evaluate(n=>n.offsetHeight);
  assert.equal(await page.locator('.lover-gifts__card:not([hidden])').count(),full?3:2);
  assert.equal(await page.locator('#lover-bank-details dl').textContent(),'');
  await box.focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  assert.equal(await box.getAttribute('aria-expanded'),'true');
  const opened=await page.locator('#lover-gifts').evaluate(n=>n.offsetHeight);
  assert(opened>closed+60);
  if(width===390) assert(opened<=850,`height ${opened}`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(full) {
   assert.equal(await page.locator('[data-gift=registry] a').getAttribute('target'),'_blank');
   assert(await page.locator('#lover-bank-details').isHidden());
   await page.locator('.lover-gifts__reveal').click();
   assert((await page.locator('#lover-bank-details').innerText()).includes('123456789012345678'));
   await page.locator('.lover-gifts__copy').click();
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'123456789012345678');
   assert((await page.locator('.lover-gifts__status').textContent()).includes('correctamente'));
  }
  if(width===390) await page.locator('#lover-gifts').screenshot({path:`.preview/lover-${full?'configured':'default'}.png`});
  await box.click(); await page.waitForTimeout(600);
  assert.equal(await box.getAttribute('aria-expanded'),'false');
  assert(await page.locator('#lover-bank-details').isHidden());
  console.log({width,full,closed,opened});
  await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
