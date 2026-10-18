import { test, expect } from "@playwright/test";
test("all redesigned screens, dark notes and compact controls remain usable", async ({
  page,
}) => {
  test.setTimeout(60000);
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Новая игра" }).waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-home-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Новая игра" }).click();await page.getByRole("button", {name:"Лёгкий",exact:true}).click();
  await page.locator(".cell.entry").first().click();
  await page.getByRole("button", { name: "Заметки", exact: true }).click();
  await page.getByRole("button", { name: "Ввести 2", exact: true }).click();
  await page.getByRole("button", { name: "Ввести 5", exact: true }).click();
  await page.screenshot({
    path: "artifacts/redesign-notes-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Крупные цифры").check();
  await page.getByRole("button", { name: "Тёмное", exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-settings-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 520, height: 900 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .getByRole("button", { name: "Ввести 1", exact: true })
      .boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(48);
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(
      await page
        .locator(".secondary-tools")
        .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    ).toBe(true);
    await page.getByLabel("Режим ввода", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Цифра → клетки", exact: true }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "Клетка → цифра", exact: true })
      .click();
    await page.screenshot({
      path: `artifacts/redesign-game-dark-${viewport.width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await page.screenshot({
    path: "artifacts/redesign-pause-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByRole("button", { name: "Подсказка", exact: true }).click();
  await page.screenshot({
    path: "artifacts/redesign-hint-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Закрыть диалог" }).click();
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-home-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-stats-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Календарь" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-calendar-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Как играть", exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "artifacts/redesign-tutorial-dark.png",
    fullPage: true,
  });
  expect(failures).toEqual([]);
});
