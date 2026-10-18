import {test,expect} from '@playwright/test';
test('compact mobile menu fits safe areas; touch settings are quiet',async({browser})=>{
 const context=await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('/');
 for(const saved of [false,true]){
  if(saved){await page.getByRole('button',{name:'Новая игра'}).click();await page.getByRole('button',{name:'Лёгкий',exact:true}).click();await page.getByRole('button',{name:'На главную',exact:true}).click()}
  await page.addStyleTag({content:'.page-home {padding-top:32px;padding-bottom:36px}'});
  await expect(page.getByRole('button',{name:'Как играть',exact:true})).toBeInViewport();
  await page.screenshot({path:`artifacts/compact-06-${saved}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.screenshot({path:`artifacts/compact-06-${saved}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Настройки',exact:true}).click();await expect(page.getByText('Управление с клавиатуры')).toHaveCount(0);await context.close();
});
test('date rolls over without interrupting a session',async({page})=>{
 await page.clock.install({time:new Date('2026-10-18T23:59:58')});await page.goto('/');await expect(page.locator('.daily-heading')).toContainText('18 октября');
 await page.clock.fastForward(3000);await expect(page.locator('.daily-heading')).toContainText('19 октября');
 await page.getByRole('button',{name:'Играть сегодня'}).click();await expect(page.locator('.game-heading')).toContainText('2026-10-19');
 await page.clock.fastForward(86400000);await expect(page.locator('.game-heading')).toContainText('2026-10-19');
});
test('daily victory offers the next unlocked date directly',async({page})=>{
 await page.clock.install({time:new Date('2026-10-20T12:00:00')});await page.goto('/');await page.getByRole('button',{name:'Новая игра'}).waitFor();
 const {initialState,newGame,withGame}=await import('../../src/core/game');
 const {readFileSync}=await import('node:fs');const p=JSON.parse(readFileSync('bank/daily-v2.jsonl','utf8').split('\n')[0]);
 const g={...newGame(p,false,'test-daily-victory'),dailyDate:'2026-10-19'},cell=g.givens.indexOf(0);g.entries=g.givens.map((d,i)=>d||i===cell?0:g.solution[i]);const state=withGame(initialState(),g);
 await page.evaluate(async s=>{await new Promise<void>(resolve=>{const r=indexedDB.open('sudoku-doku',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('state','readwrite');t.objectStore('state').put(JSON.stringify(s),'root');t.oncomplete=()=>{db.close();resolve()}}})},state);
 await page.reload();await page.getByRole('button',{name:'Календарь',exact:true}).click();await page.getByRole('button',{name:'2026-10-19, начато',exact:true}).click();await page.locator(`[data-cell="${cell}"]`).click();await page.getByRole('button',{name:`Ввести ${g.solution[cell]}`,exact:true}).click();
 await page.getByRole('button',{name:'Следующий нерешённый день'}).click();await expect(page.locator('.game-heading')).toContainText('2026-10-20');
});
