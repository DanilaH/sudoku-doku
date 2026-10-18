import {test,expect} from '@playwright/test';
test('home previews, difficulty, notes lesson and modal keyboard', async({page})=>{
 await page.goto('/');
 for(const width of [360,390,1280]) {
  await page.setViewportSize({width,height:844});
  await expect(page.getByRole('button',{name:'Новая игра'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.board-preview button')).toHaveCount(0);
  await page.screenshot({path:`artifacts/home-05-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Новая игра'}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.home')).toBeVisible();
 await page.getByRole('button',{name:'Новая игра'}).click();
 await page.getByRole('button',{name:'Лёгкий',exact:true}).click();
 await expect(page.locator('.start-instruction')).toBeVisible();
 await page.getByRole('button',{name:'На главную',exact:true}).click();
 await expect(page.locator('.saved-overview')).toBeVisible();
 await expect(page.locator('.session-progress')).toHaveCount(0);
 await page.getByRole('button',{name:'Новая игра'}).click();
 await page.getByRole('button',{name:'Средний',exact:true}).click();
 await expect(page.getByText('Заменить текущую партию?')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Как играть',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Дальше'}).click();
 await page.getByRole('button',{name:'Учебная пустая клетка'}).click();
 await expect(page.locator('.lesson-digit')).toBeDisabled();
 await page.getByRole('button',{name:'Заметки',exact:true}).click();
 await page.locator('.lesson-digit').click();
 await expect(page.locator('.lesson-note')).toHaveText('3');
 await page.locator('.lesson-digit').click();
 await expect(page.getByText('Готово: заметка удалена')).toBeVisible();
});
