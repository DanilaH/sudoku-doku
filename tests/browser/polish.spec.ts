import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const puzzle = readFileSync("bank/puzzles-v1.jsonl", "utf8").trim().split("\n").map(line=>JSON.parse(line)).find(p=>p.difficulty==='EASY');
test("digit-first notes, settings return, error scheme and daily isolation", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Начать игру" }).click();
  const c = puzzle.givens.indexOf("0");
  await page
    .getByRole("button", { name: "Цифра → клетки", exact: true })
    .click();
  await page.getByRole("button", { name: "Ввести 3", exact: true }).click();
  await page.getByRole("button", { name: "Заметки", exact: true }).click();
  await page.locator(`[data-cell="${c}"]`).click();
  await expect(page.locator(`[data-cell="${c}"] .notes`)).toContainText("3");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Показывать таймер").uncheck();
  await page.getByLabel("Крупные цифры").check();
  await page.getByRole("button", { name: "Тёмное", exact: true }).click();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Цифра → клетки", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Активное время")).toHaveCount(0);
  await expect(page.locator(`[data-cell="${c}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Заметки", exact: true }).click();
  const wrong = (Number(puzzle.solution[c]) % 9) + 1;
  const key = page.getByRole("button", {
    name: `Ввести ${wrong}`,
    exact: true,
  });
  if ((await key.getAttribute("aria-pressed")) !== "true") await key.click();
  await page.locator(`[data-cell="${c}"]`).click();
  await expect(page.locator(`[data-cell="${c}"]`)).toHaveText(String(wrong));
  await page.getByRole("button", { name: "Подсказка", exact: true }).click();
  await expect(page.getByText("Сначала исправим ввод.")).toBeVisible();
  await page.locator(".error-grid button.bad").first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/polish-dark-large.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Задача дня" }).click();
  await page.getByRole("button", { name: "Играть сегодня" }).click();
  const dailyCell = page.locator(".cell.entry").first();
  await dailyCell.click();
  await page.getByRole("button", { name: "Ввести 5", exact: true }).click();
  await expect(dailyCell).toHaveText("5");
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Продолжить партию" }).click();
  await expect(page.locator(`[data-cell="${c}"]`)).toHaveText(String(wrong));
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Задача дня" }).click();
  await page.screenshot({
    path: "artifacts/daily-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Продолжить сегодняшнюю" }).click();
  await expect(page.locator(".cell.entry").first()).toHaveText("5");
  expect(failures).toEqual([]);
});
test("tutorial is interactive, skippable and replayable without a game", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Как играть", exact: true }).click();
  await page
    .getByRole("button", { name: "Учебная цифра 1", exact: true })
    .click();
  await expect(page.locator(".lesson-row .active")).toHaveCount(9);
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Учебная пустая клетка" }).click();
  await page.locator(".lesson-digit").click();
  await expect(
    page.getByRole("button", { name: "Учебная пустая клетка" }),
  ).toHaveText("3");
  await page.getByRole("button", { name: "Пропустить обучение" }).click();
  await expect(page.getByRole("button", { name: "Начать игру" })).toBeVisible();
  await page.getByRole("button", { name: "Как играть", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Правило девяти" }),
  ).toBeVisible();
});
