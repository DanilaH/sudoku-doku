import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {initialState,newGame} from '../../src/core/game';
const puzzle=JSON.parse(readFileSync('bank/puzzles-v1.jsonl','utf8').split('\n')[0]);
const sdk=`window.sdkEvents=[];window.sdkHandlers={};window.YaGames={init:async()=>({features:{LoadingAPI:{ready:()=>sdkEvents.push('ready')},GameplayAPI:{start:()=>sdkEvents.push('start'),stop:()=>sdkEvents.push('stop')}},adv:{showBannerAdv:async()=>sdkEvents.push('banner'),hideBannerAdv:async()=>sdkEvents.push('hide'),showFullscreenAdv:({callbacks})=>{sdkEvents.push('ad');callbacks.onOpen();callbacks.onClose(true);callbacks.onClose(true)}},on:(n,f)=>{sdkHandlers[n]=f},off:(n)=>{delete sdkHandlers[n]}})};`;
test('SDK markup, pause events, reliable storage and exactly one result ad',async({page})=>{
 await page.route('**/sdk.js',r=>r.fulfill({contentType:'application/javascript',body:sdk}));
 const g=newGame(puzzle),c=g.givens.indexOf(0);g.entries=g.givens.map((d,i)=>d||i===c?0:g.solution[i]);
 const state=initialState();state.current=g;state.normal=g;state.results=[1,2].map(n=>({gameId:`previous-${n}`,puzzleId:`previous-${n}`,difficulty:'EASY',activeMs:100,hints:0,completedAt:100,replay:false}));state.ads.firstCompleted=true;
 await page.addInitScript(s=>localStorage.setItem('sudoku-doku-v1',JSON.stringify(s)),state);
 await page.goto('/');await page.getByRole('button',{name:'Продолжить партию'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).sdkEvents.includes('ready'))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).sdkEvents.includes('start'))).toBe(true);
 await page.evaluate(()=>(window as any).sdkHandlers.game_api_pause());await expect(page.getByText('Время остановлено')).toBeVisible();await page.evaluate(()=>(window as any).sdkHandlers.game_api_resume());await expect(page.locator('.pause-cover')).toHaveCount(0);
 await page.locator(`[data-cell="${c}"]`).click();await page.getByRole('button',{name:`Ввести ${g.solution[c]}`,exact:true}).click();await expect(page.getByText('Все цифры')).toBeVisible();await expect(page.getByText('Сохранено',{exact:true})).toBeAttached();
 await page.evaluate(()=>{const btn=document.querySelector<HTMLButtonElement>('.result .text-button')!;btn.click();btn.click()});await expect(page.getByRole('button',{name:'Новая игра'})).toBeVisible();expect(await page.evaluate(()=>(window as any).sdkEvents.filter((s:string)=>s==='ad').length)).toBe(1);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sudoku-doku-v1')!));expect(saved.results).toHaveLength(3);expect(saved.ads.impressions).toHaveLength(1);
});
test('SDK download failure still allows a local game',async({page})=>{await page.route('**/sdk.js',r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Новая игра'}).click();await page.getByRole("button", {name:"Лёгкий",exact:true}).click();await expect(page.locator('.board')).toBeVisible();await expect(page.getByText('Сохранено',{exact:true})).toBeAttached();expect(await page.evaluate(()=>Boolean(localStorage.getItem('sudoku-doku-v1')))).toBe(true)});
