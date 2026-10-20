import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync('package.json','utf8'));
for(const viewport of [{width:320,height:568},{width:360,height:640},{width:844,height:390},{width:568,height:320},{width:600,height:320},{width:640,height:360}])test(`filled notes keep square cells at ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');await page.locator('.new-game').waitFor();
 await page.evaluate(async()=>{
  // Vite serves source modules in this browser regression environment.
  const gamePath='/src/core/game.ts',bankPath='/src/core/bank.ts';
  const G=await import(/* @vite-ignore */ gamePath),B=await import(/* @vite-ignore */ bankPath);
  const g=G.newGame(B.puzzles[0]);g.notes=g.givens.map((d:number)=>d?0:1022);const s=G.withGame(G.initialState(),g);s.settings.largeDigits=true;
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('sudoku-doku',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('state','readwrite');t.objectStore('state').put(JSON.stringify(s),'root');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)}});
 });
 await page.reload();await page.locator('.continue').click();await page.locator('.board').waitFor();
 const geometry=await page.evaluate(()=>{const b=document.querySelector('.board')!.getBoundingClientRect();const cells=[...document.querySelectorAll('.cell')].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth-innerWidth,scroll:document.documentElement.scrollHeight-innerHeight,digitOverflow:[...document.querySelectorAll('.cell>span:not(.notes)')].some(e=>e.getBoundingClientRect().height>e.parentElement!.getBoundingClientRect().height),width:b.width,height:b.height,rows:Array.from({length:9},(_,r)=>Math.max(...cells.slice(r*9,r*9+9).map(c=>c.bottom))-Math.min(...cells.slice(r*9,r*9+9).map(c=>c.bottom))),keyBottom:document.querySelector('.numpad')!.getBoundingClientRect().bottom}});
 expect(geometry.overflow).toBe(0);expect(geometry.scroll).toBe(0);expect(geometry.digitOverflow).toBe(false);expect(Math.abs(geometry.width-geometry.height)).toBeLessThan(1);expect(Math.max(...geometry.rows)).toBeLessThan(1);expect(geometry.keyBottom).toBeLessThanOrEqual(viewport.height);
});
test('invalid device date is explained and settings show build version',async({page})=>{
 await page.clock.setFixedTime(new Date('2024-12-15T12:00:00Z'));const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('.calendar-link').click();await expect(page.getByRole('button',{name:'Задача на эту дату недоступна',exact:false})).toBeDisabled();await expect(page.getByText('Архив начинается с января 2025 года.',{exact:false})).toBeVisible();await page.locator('.top button').first().click();await page.getByRole('button',{name:'Настройки',exact:true}).click();await expect(page.getByText(`Версия ${version} · Банк 2 · Ежедневные 2`,{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('short landscape victory keeps next task accessible',async({page})=>{
 await page.setViewportSize({width:568,height:320});await page.goto('/');await page.locator('.new-game').waitFor();
 const last=await page.evaluate(async()=>{
  const gamePath='/src/core/game.ts',bankPath='/src/core/bank.ts';const G=await import(/* @vite-ignore */ gamePath),B=await import(/* @vite-ignore */ bankPath);
  const g=G.newGame(B.puzzles[0]),cell=g.givens.indexOf(0);g.entries=g.givens.map((d:number,i:number)=>d||i===cell?0:g.solution[i]);const s=G.withGame(G.initialState(),g);
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('sudoku-doku',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('state','readwrite');t.objectStore('state').put(JSON.stringify(s),'root');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)}});return {cell,digit:g.solution[cell]};
 });
 await page.reload();await page.locator('.continue').click();await page.locator(`[data-cell="${last.cell}"]`).click();await page.getByRole('button',{name:`Ввести ${last.digit}`,exact:true}).click();
 const next=page.getByRole('button',{name:'Следующая задача →',exact:true});await expect(next).toBeInViewport();await page.screenshot({path:'artifacts/short-landscape-victory.png',fullPage:true});await next.click();await expect(page.locator('.numpad')).toBeVisible();
});
