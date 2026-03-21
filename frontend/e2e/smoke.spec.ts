import { expect, test } from "@playwright/test";

test("strona główna ładuje tytuł StayMap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /StayMap/i }).first()).toBeVisible({ timeout: 15_000 });
});

test("link do wyszukiwania (nav desktop)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Wyszukaj$/ })).toBeVisible({ timeout: 15_000 });
});
