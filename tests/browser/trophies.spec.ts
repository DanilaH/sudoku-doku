import { test, expect } from "@playwright/test";
test("archive navigation, trophies and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Трофеи", exact: true }).click();
  await page.getByLabel("Год трофеев").selectOption("2025");
  await expect(page.locator(".trophy-card")).toHaveCount(12);
  await expect(page.locator(".screen-content")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.screenshot({
    path: "artifacts/trophies-2025.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /январь 2025:/ }).click();
  await expect(
    page.getByRole("button", { name: "Предыдущий месяц" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "2025-01-01", exact: true }).click();
  await expect(page.locator(".board")).toBeVisible();
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Трофеи", exact: true }).click();
  await page.getByLabel("Год трофеев").selectOption("2025");
  await page.getByRole("button", { name: /январь 2025:/ }).click();
  await expect(
    page.getByRole("button", { name: "2025-01-01, начато", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: /Трофей месяца/ }).click();
  await expect(page.locator(".screen-content")).toHaveCSS(
    "animation-name",
    "screen-in",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
