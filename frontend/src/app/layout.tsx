import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { MainShell } from "@/components/layout/MainShell";
import { Navbar } from "@/components/layout/Navbar";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "StayMap Polska - Noclegi w Polsce",
  description:
    "Domki, glamping i apartamenty w najpiękniejszych miejscach Polski. Wyszukaj na mapie i zarezerwuj.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030a05" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;

  return (
    <html lang="pl" className={dmSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased dark:bg-[var(--background)] dark:text-[var(--foreground)]">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Navbar />
        <MainShell>{children}</MainShell>
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom:
              "calc(14px + var(--compare-bar-pad, 0px) + max(var(--guest-nav-bottom-offset, 0px), var(--mobile-safe-bottom)))",
          }}
          toastOptions={{
            className: "font-sans text-sm font-medium",
            style: {
              fontFamily: "var(--font-dm), system-ui, sans-serif",
              fontSize: "13px",
              fontWeight: 500,
            },
            success: {
              style: {
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
              },
            },
            error: {
              style: {
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
