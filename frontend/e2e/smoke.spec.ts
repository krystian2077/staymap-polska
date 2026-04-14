import { expect, test } from "@playwright/test";

const warszawaListing = {
  id: "warszawa-1",
  slug: "warszawa-1",
  title: "Warszawa Lodge",
  base_price: "250.00",
  currency: "PLN",
  status: "approved",
  max_guests: 4,
  booking_mode: "instant",
  location: { lat: 52.23, lng: 21.01, city: "Warszawa", region: "mazowieckie", country: "PL" },
  cover_image: null,
  created_at: "2026-01-01T00:00:00Z",
};

const lodzListing = {
  id: "lodz-1",
  slug: "lodz-1",
  title: "Łódź Apartment",
  base_price: "180.00",
  currency: "PLN",
  status: "approved",
  max_guests: 2,
  booking_mode: "instant",
  location: { lat: 51.77, lng: 19.46, city: "Łódź", region: "łódzkie", country: "PL" },
  cover_image: null,
  created_at: "2026-01-01T00:00:00Z",
};

const krakowListing = {
  id: "krakow-1",
  slug: "krakow-1",
  title: "Kraków Cabin",
  base_price: "220.00",
  currency: "PLN",
  status: "approved",
  max_guests: 3,
  booking_mode: "instant",
  location: { lat: 50.06, lng: 19.94, city: "Kraków", region: "małopolskie", country: "PL" },
  cover_image: null,
  created_at: "2026-01-01T00:00:00Z",
};

const warszawaPin = {
  id: "warszawa-1",
  lat: 52.23,
  lng: 21.01,
  price: "250.00",
  title: "Warszawa Lodge",
  city: "Warszawa",
};

const lodzPin = {
  id: "lodz-1",
  lat: 51.77,
  lng: 19.46,
  price: "180.00",
  title: "Łódź Apartment",
  city: "Łódź",
};

const krakowPin = {
  id: "krakow-1",
  lat: 50.06,
  lng: 19.94,
  price: "220.00",
  title: "Kraków Cabin",
  city: "Kraków",
};

function makeListResponse(active: boolean) {
  const data = active ? [warszawaListing, lodzListing] : [warszawaListing, lodzListing, krakowListing];
  return {
    data,
    meta: { next: null, previous: null, count: data.length },
  };
}

function makeMapResponse(active: boolean) {
  return {
    data: active ? [warszawaPin, lodzPin] : [warszawaPin, lodzPin, krakowPin],
  };
}

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

  test("sekcje koncowe sa widoczne", async ({ page }) => {
    await page.goto("/");

    const aiSection = page.getByTestId("home-ai-section");
    await aiSection.scrollIntoViewIfNeeded();
    await expect(aiSection).toBeVisible();


    const hostCta = page.getByTestId("home-host-cta-section");
    await hostCta.scrollIntoViewIfNeeded();
    await expect(hostCta).toBeVisible();
    await expect(page.getByTestId("home-host-cta-primary")).toBeVisible();

    const footer = page.getByTestId("home-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toContainText(/StayMap Polska/i);
  });
});


