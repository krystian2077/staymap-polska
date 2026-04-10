import { expect, test } from "@playwright/test";

test("strona główna ładuje tytuł StayMap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /StayMap/i }).first()).toBeVisible({ timeout: 15_000 });
});

test("link do wyszukiwania (nav desktop)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Wyszukaj$/ })).toBeVisible({ timeout: 15_000 });
});

test.describe("homepage mobile 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sekcje koncowe i CTA sa widoczne", async ({ page }) => {
    await page.goto("/");

    const aiSection = page.getByTestId("home-ai-section");
    await aiSection.scrollIntoViewIfNeeded();
    await expect(aiSection).toBeVisible();

    const guestCta = page.getByTestId("home-guest-cta-section");
    await guestCta.scrollIntoViewIfNeeded();
    await expect(guestCta).toBeVisible();
    await expect(page.getByTestId("home-guest-cta-primary")).toBeVisible();
    await expect(page.getByTestId("home-guest-cta-secondary")).toBeVisible();

    const hostCta = page.getByTestId("home-host-cta-section");
    await hostCta.scrollIntoViewIfNeeded();
    await expect(hostCta).toBeVisible();
    await expect(page.getByTestId("home-host-cta-primary")).toBeVisible();

    const footer = page.getByTestId("home-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toContainText(/StayMap Polska/i);
  });
});

