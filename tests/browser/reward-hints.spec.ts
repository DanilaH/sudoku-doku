import {test,expect} from '@playwright/test';
const mock=`export const isAndroid=()=>true;
const listeners=new Map();window.bannerCalls=[];window.rewardMode='success';
export const Native={read:async()=>({value:localStorage.getItem('native-state')}),write:async({value})=>localStorage.setItem('native-state',value),event:async()=>{},keepAwake:async()=>{},prepareAd:async()=>{},banner:async o=>{window.bannerCalls.push(o);return o.visible?{height:96}:{}},readReward:async()=>JSON.parse(localStorage.getItem('pending-reward')||'{}'),ackReward:async()=>localStorage.removeItem('pending-reward'),addListener:async(name,fn)=>{listeners.set(name,fn);return{remove:async()=>listeners.delete(name)}},showReward:async({gameId})=>{if(window.rewardMode==='empty')return{shown:false,rewarded:false};if(window.rewardMode==='close')return{shown:true,rewarded:false};const r={id:crypto.randomUUID(),gameId};localStorage.setItem('pending-reward',JSON.stringify(r));listeners.get('hintReward')?.(r);listeners.get('hintReward')?.(r);return{shown:true,rewarded:true,rewardId:r.id}}};`;
test.beforeEach(async({page})=>{await page.route('**/src/platform/native.ts',route=>route.fulfill({contentType:'application/javascript',body:mock}));});
async function start(page:import('@playwright/test').Page){await page.goto('/');await page.getByRole('button',{name:'Новая игра'}).click();await page.getByRole('button',{name:'Лёгкий',exact:true}).click();}
test('three hints persist, video grants one pack, cancel and no fill grant nothing',async({page})=>{
 await start(page);
 for(let count=3;count>0;count--){await page.getByRole('button',{name:`Подсказка · ${count}`,exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Применить подсказку',exact:true}).click();}
 await page.reload();await page.locator('.continue').click();
 for(const mode of ['empty','close','success']){
  await page.evaluate(m=>{(window as any).rewardMode=m},mode);await page.getByRole('button',{name:'▶ +3 за видео',exact:true}).click();await page.screenshot({path:'artifacts/reward-offer.png'});await page.getByRole('button',{name:'▶ +3 подсказки за видео',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(mode==='success'?'Добавлены 3':mode==='empty'?'недоступна':'не завершён');await page.getByRole('button',{name:'К игре',exact:true}).click();
 }
 await expect(page.getByRole('button',{name:'Подсказка · 3',exact:true})).toBeVisible();await page.reload();await page.locator('.continue').click();await expect(page.getByRole('button',{name:'Подсказка · 3',exact:true})).toBeVisible();
});
test('banner remains visible on small portrait and landscape screens',async({page})=>{
 await page.setViewportSize({width:390,height:640});await start(page);
 for(const [width,height,visible] of [[390,640,true],[390,1000,true],[844,390,true],[568,320,true],[320,568,true],[390,1000,true]] as const){await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>(window as any).bannerCalls.at(-1)?.visible)).toBe(visible);
 await page.screenshot({path:`artifacts/banner-${width}x${height}.png`});
 await expect.poll(()=>page.evaluate(()=>{const ad=document.querySelector('.ad-slot')!.getBoundingClientRect();const board=document.querySelector('.board')!.getBoundingClientRect();const controls=document.querySelector('.secondary-tools')!.getBoundingClientRect();const separate=board.right<=ad.left || board.bottom<=ad.top;return separate && controls.bottom<=ad.top+1 && board.bottom<=innerHeight && ad.bottom<=innerHeight && ad.left>=0 && ad.right<=innerWidth})).toBe(true);
 await page.screenshot({path:`artifacts/banner-${width}x${height}.png`});
 }
 await expect(page.locator('.ad-slot')).toHaveCSS('height','96px');await page.getByRole('button',{name:'Настройки',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).bannerCalls.at(-1)?.visible)).toBe(false);
});

test('same explanation stays free after closing and reload',async({page})=>{
 await start(page);await page.getByRole('button',{name:'Подсказка · 3',exact:true}).click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Открытая подсказка',exact:true}).click();await page.keyboard.press('Escape');
 await page.reload();await page.locator('.continue').click();await page.getByRole('button',{name:'Открытая подсказка',exact:true}).click();
 await page.getByRole('button',{name:'Применить подсказку',exact:true}).click();await expect(page.getByRole('button',{name:'Подсказка · 2',exact:true})).toBeVisible();
});
