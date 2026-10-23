import {test,expect} from '@playwright/test';
test('refreshed home fills the viewport and destinations remain usable',async({page})=>{
 for(const [width,height] of [[390,844],[390,1000],[1280,800]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.getByRole('button',{name:'Новая игра'}).waitFor();await page.waitForTimeout(300);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.screenshot({path:`artifacts/refresh-home-${width}-${height}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Профиль',exact:true}).click();await expect(page.getByRole('textbox',{name:'Имя',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Изменить имя',exact:true}).click();await page.getByRole('textbox',{name:'Имя',exact:true}).fill('Данила');await page.getByRole('button',{name:'Сохранить имя',exact:true}).click();await expect(page.getByRole('heading',{name:'Данила',exact:true})).toBeVisible();
 await page.waitForTimeout(300);await page.screenshot({path:'artifacts/refresh-profile.png'});
 await page.getByRole('button',{name:'Вся статистика →',exact:true}).click();await expect(page.getByText('Первая победа впереди')).toBeVisible();
 await page.getByRole('button',{name:'На главную',exact:true}).click();
 for(const name of ['Календарь','Трофеи','Настройки']){
  await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:`artifacts/refresh-${name}.png`,fullPage:true});
  const home=page.getByRole('button',{name:'На главную',exact:true});if(await home.count())await home.click();else await page.getByRole('button',{name:'Назад',exact:true}).click();
 }
 await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.getByRole('button',{name:'Тёмное',exact:true}).click();await page.getByRole('button',{name:'На главную',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:'artifacts/refresh-home-dark.png'});
});
