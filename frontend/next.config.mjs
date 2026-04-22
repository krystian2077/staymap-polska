import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Monorepo: główny `.env` leży w katalogu nadrzędnym — `npm run dev` z `frontend/` wczytuje tylko `frontend/.env*`.
loadEnvConfig(path.join(__dirname, ".."));

// Dodaje domenę Railway backendu do dozwolonych źródeł obrazów (ustawiana przez NEXT_PUBLIC_API_URL)
function buildProductionImagePattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (!apiUrl || apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    return null;
  }
  try {
    const url = new URL(apiUrl);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      pathname: "/media/**",
    };
  } catch {
    return null;
  }
}

const productionPattern = buildProductionImagePattern();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...(productionPattern ? [productionPattern] : []),
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "backend",
        port: "8000",
        pathname: "/media/**",
      },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      { protocol: "https", hostname: "*.cloudflarestorage.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
