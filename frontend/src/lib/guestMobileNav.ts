/**
 * Hybrydowa nawigacja dolna gościa: widoczna na większości tras,
 * ukryta na mapie wyszukiwania, checkout, panelu gospodarza i ekranach logowania.
 */
export function shouldShowGuestMobileNav(pathname: string): boolean {
  if (pathname.startsWith("/host")) return false;
  if (pathname === "/search" || pathname.startsWith("/search/")) return false;
  if (pathname.startsWith("/booking")) return false;
  if (pathname === "/login" || pathname === "/register") return false;
  return true;
}
