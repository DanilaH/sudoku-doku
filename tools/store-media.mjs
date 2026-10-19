// Render a layout around unaltered native Android captures; no UI redrawing.
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
const [source,out]=process.argv.slice(2);
if(!source||!out)throw Error('node tools/store-media.mjs SOURCE_DIR OUTPUT_DIR');
for(const d of ['with-text','without-text','originals'])fs.mkdirSync(path.join(out,d),{recursive:true});
const shots=[
 ['01-game','android-game-light.png','Судоку. Просто<br>начните играть.','Заметки, отмена и подсказки'],
 ['02-home','android-home-06.png','1800 задач.<br>Три сложности.','Выбирайте свой уровень'],
 ['03-calendar','store-calendar.png','Новый день —<br>новая задача.','Пропущенные дни тоже доступны'],
 ['04-trophies','store-trophies.png','Соберите медали<br>за каждый месяц.','Бронза, серебро и золото'],
 ['05-statistics','store-statistics.png','Ваш прогресс.<br>Всё перед глазами.','Общая статистика и по сложности'],
];
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
for(let i=0;i<shots.length;i++){
 const [name,file,title,sub]=shots[i];const src=fs.readFileSync(path.join(source,file));fs.copyFileSync(path.join(source,file),path.join(out,'originals',file));
 for(const withText of [true,false]){
 const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;overflow:hidden;background:radial-gradient(ellipse at 0% 0%,#448cec 0,transparent 62%),radial-gradient(ellipse at 100% 95%,#9271dd 0,transparent 65%),linear-gradient(145deg,#2557b7,#50368b);color:white;font-family:'DejaVu Sans',sans-serif}.grid{position:absolute;inset:0;opacity:.07;background-image:linear-gradient(#fff 2px,transparent 2px),linear-gradient(90deg,#fff 2px,transparent 2px);background-size:180px 180px;mask-image:linear-gradient(130deg,#000,transparent 75%)}header{position:absolute;left:80px;top:72px}h1{font-size:69px;line-height:1.16;letter-spacing:-2.5px;margin:0;font-weight:700}p{font-size:29px;margin:24px 0 0;color:#e0eaff}.screen{position:absolute;left:50%;transform:translateX(-50%);top:${withText?365:100}px;width:${withText?820:960}px;border:2px solid #ffffff55;border-radius:30px;overflow:hidden;box-shadow:0 30px 80px #15254e70;background:#f7f8fc}.screen img{display:block;width:100%;height:auto}.footer{position:absolute;bottom:36px;left:80px;right:80px;display:flex;justify-content:space-between;color:#e6e8ff;font-size:22px;letter-spacing:3px}</style><div class="grid"></div>${withText?`<header><h1>${title}</h1><p>${sub}</p></header>`:''}<div class="screen"><img src="data:image/png;base64,${src.toString('base64')}"></div>${withText?`<div class="footer"><span>СУДОКУ</span><span>0${i+1} / 05</span></div>`:''}`;
 await page.setContent(html);await page.locator('img').evaluate(img=>img.decode());await page.screenshot({path:path.join(out,withText?'with-text':'without-text',name+'.jpg'),type:'jpeg',quality:96});
 }
}
// Same vector geometry and colours as the Android launcher foreground.
await page.setViewportSize({width:512,height:512});
await page.setContent(`<style>body{margin:0;background:#f7f8fc}svg{width:512px;height:512px}</style><svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg"><rect width="108" height="108" fill="#f7f8fc"/><path fill="none" stroke="#365f8b" stroke-width="2" d="M44 25V83M64 25V83M25 44H83M25 64H83M25 25H83V83H25Z"/><path fill="none" stroke="#365f8b" stroke-width="3" stroke-linecap="round" d="M34 31V39M51 51H57V58H51V51M57 58V62M72 70H77L72 79H77"/></svg>`);
await page.screenshot({path:path.join(out,'icon-512.png')});
// Contact sheet for visual review, not for store upload.
await page.setViewportSize({width:1500,height:1100});
const imgs=['with-text','without-text'].flatMap(dir=>shots.map(([name])=>`<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(out,dir,name+'.jpg')).toString('base64')}">`));
await page.setContent(`<style>body{margin:0;padding:20px;background:#18233c;display:grid;grid-template-columns:repeat(5,1fr);gap:16px}img{width:100%;border-radius:8px}</style>${imgs.join('')}`);
await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));await page.screenshot({path:path.join(out,'preview.jpg'),type:'jpeg',quality:90});
await browser.close();console.log('Rendered 10 screenshots, icon and preview in '+out);
