import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const chunks = token.split(".");
    if (chunks.length < 2) return null;
    const base64 = chunks[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(normalized);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/wishlist" ||
    pathname === "/messages" ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/host")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get("access_token")?.value ?? "";
  if (!accessToken) return redirectToLogin(request);

  if (pathname.startsWith("/host")) {
    const payload = decodeJwtPayload(accessToken);
    const isHost = Boolean(payload?.is_host);
    if (!isHost && pathname !== "/host/onboarding") {
      return NextResponse.redirect(new URL("/host/onboarding", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/wishlist", "/messages", "/booking/:path*", "/account/:path*", "/host/:path*"],
};
