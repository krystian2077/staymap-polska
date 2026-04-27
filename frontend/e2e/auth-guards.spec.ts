import { expect, test } from "@playwright/test";

function b64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}.sig`;
}

test.describe("middleware auth guards", () => {
  test("niezalogowany użytkownik jest przekierowany z /wishlist na /login", async ({
    request,
  }) => {
    const res = await request.get("/wishlist", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fwishlist");
  });

  test("niezalogowany użytkownik jest przekierowany z /host na /login", async ({
    request,
  }) => {
    const res = await request.get("/host", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fhost");
  });

  test("zalogowany nie-host jest przekierowany z /host na /host/onboarding", async ({
    context,
  }) => {
    const accessToken = makeJwt({ sub: "user-1", is_host: false });
    await context.addCookies([
      {
        name: "access_token",
        value: accessToken,
        url: "http://127.0.0.1:3000",
      },
    ]);

    const res = await context.request.get("/host", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers()["location"] ?? "").toContain("/host/onboarding");
  });
});

