import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { MainShell } from "@/components/layout/MainShell";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "StayMap Polska — Noclegi w Polsce",
  description:
    "Domki, glamping i apartamenty w najpiękniejszych miejscach Polski. Wyszukaj na mapie i zarezerwuj.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={dmSans.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Navbar />
        <MainShell>{children}</MainShell>
        <Toaster
          position="bottom-right"
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
