import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/account",
  "/booking",
  "/bookings",
  "/dashboard",
  "/host",
  "/ai",
  "/wishlist",
  "/compare",
];

const HOST_PUBLIC_PREFIXES = ["/host/onboarding", "/host/panel"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const needsHostClaim =
    pathname.startsWith("/host") &&
    !HOST_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const jwtSecret = process.env.JWT_SECRET;
  if (needsHostClaim && jwtSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      if (payload.is_host !== true) {
        return NextResponse.redirect(new URL("/host/onboarding", request.url));
      }
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/booking/:path*",
    "/bookings/:path*",
    "/dashboard/:path*",
    "/host/:path*",
    "/ai",
    "/wishlist",
    "/compare",
  ],
};
