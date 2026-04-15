import { expect, test } from "@playwright/test";

test.describe("guest mobile bottom nav (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("dolna nawigacja widoczna na stronie głównej", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Nawigacja główna" });
    await expect(nav).toBeVisible({ timeout: 15_000 });
    await expect(nav.getByRole("link", { name: "Start" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Szukaj" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Ulubione" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Rezerwacje" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Konto" })).toBeVisible();
  });

  test("dolna nawigacja ukryta na /search (mapa)", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("navigation", { name: "Nawigacja główna" })).toHaveCount(0);
  });

  test("nawigacja między Start a Ulubione", async ({ page }) => {
    await page.goto("/");
    const bottomNav = page.locator("nav.fixed.bottom-0").filter({ has: page.getByRole("link", { name: "Start" }) });
    await bottomNav.locator('a[href="/wishlist"]').click();
    await expect(page).toHaveURL(/\/wishlist/);
    await expect(
      page.locator("nav.fixed.bottom-0").filter({ has: page.getByRole("link", { name: "Start" }) })
    ).toBeVisible();
  });

  test("menu hamburger otwiera arkusz z linkami platformy", async ({ page }) => {
    await page.goto("/");
    const menuBtn = page.locator("header button[aria-controls='mobile-main-nav']");
    await expect(menuBtn).toBeVisible({ timeout: 20_000 });
    await menuBtn.click();
    const sheet = page.locator("#mobile-main-nav");
    await expect(sheet.getByText("Platforma", { exact: true })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Wyszukaj" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "StayMap AI" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet.getByRole("link", { name: "Wyszukaj" })).not.toBeVisible();
  });

  test("strona główna bez błędów konsoli (hydratacja)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await expect(page.getByTestId("home-ai-section")).toBeVisible({ timeout: 20_000 });
    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Failed to load resource") &&
        !e.includes("net::ERR_")
    );
    expect(critical, critical.join("\n")).toEqual([]);
  });
});
