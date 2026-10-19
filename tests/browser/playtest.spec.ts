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
 await page.clock.install({time:new Date('2026-10-18T23:58:00')});await page.goto('/');await expect(page.locator('.daily-heading')).toContainText('18 октября');
 await page.clock.fastForward(121000);await expect(page.locator('.daily-heading')).toContainText('19 октября');
 await page.getByRole('button',{name:'Играть сегодня'}).click();await expect(page.locator('.game-heading')).toContainText('2026-10-19');
 await page.clock.fastForward(86400000);await expect(page.locator('.game-heading')).toContainText('2026-10-19');
});
test('daily victory offers the next unlocked date directly',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.clock.install({time:new Date('2026-10-20T12:00:00')});await page.goto('/');await page.getByRole('button',{name:'Новая игра'}).waitFor();
 const {initialState,newGame,withGame}=await import('../../src/core/game');
 const {readFileSync}=await import('node:fs');const p=JSON.parse(readFileSync('bank/daily-v2.jsonl','utf8').split('\n')[0]);
 const g={...newGame(p,false,'test-daily-victory'),dailyDate:'2026-10-19'},cell=g.givens.indexOf(0);g.entries=g.givens.map((d,i)=>d||i===cell?0:g.solution[i]);const state=withGame(initialState(),g);
 await page.evaluate(async s=>{await new Promise<void>(resolve=>{const r=indexedDB.open('sudoku-doku',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('state','readwrite');t.objectStore('state').put(JSON.stringify(s),'root');t.oncomplete=()=>{db.close();resolve()}}})},state);
 await page.reload();await page.getByRole('button',{name:'Календарь',exact:true}).click();await page.getByRole('button',{name:'2026-10-19, начато',exact:true}).click();await page.locator(`[data-cell="${cell}"]`).click();await page.getByRole('button',{name:`Ввести ${g.solution[cell]}`,exact:true}).click();
 await expect(page.getByRole('button',{name:'Задача за 20.10.2026 →'})).toBeInViewport();await page.getByRole('button',{name:'Задача за 20.10.2026 →'}).click();await expect(page.locator('.game-heading')).toContainText('2026-10-20');
});
test('both saved modes fit the compact menu and archive resumes directly',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();await page.clock.install({time:new Date('2026-10-19T12:00:00')});await page.goto('/');await page.locator('.new-game').waitFor();
 const {initialState,newGame,withGame}=await import('../../src/core/game');const {readFileSync}=await import('node:fs');const puzzle=JSON.parse(readFileSync('bank/puzzles-v1.jsonl','utf8').split('\n')[0]);
 let state=withGame(initialState(),newGame(puzzle));state=withGame(state,{...newGame(puzzle),dailyDate:'2026-10-18'});
 await page.evaluate(async s=>{await new Promise<void>(resolve=>{const r=indexedDB.open('sudoku-doku',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('state','readwrite');t.objectStore('state').put(JSON.stringify(s),'root');t.oncomplete=()=>{db.close();resolve()}}})},state);
 await page.reload();await page.locator('.archive-resume').waitFor();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 await page.setViewportSize({width:360,height:640});await page.addStyleTag({content:'.page-home {padding-top:32px;padding-bottom:36px}'});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 await page.locator('.archive-resume').click();await expect(page.locator('.game-heading')).toContainText('2026-10-18');await context.close();
});
