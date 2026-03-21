import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0a2e1a",
          DEFAULT: "#16a34a",
          light: "#4ade80",
          surface: "#f0fdf4",
          muted: "#dcfce7",
          border: "#bbf7d0",
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        text: {
          DEFAULT: "#111827",
          secondary: "#6b7280",
          muted: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,.06)",
        elevated: "0 4px 16px rgba(0,0,0,.08)",
        hover: "0 16px 40px rgba(0,0,0,.1)",
        brand: "0 0 0 3px rgba(22,163,74,.18)",
        "brand-lg": "0 8px 20px rgba(22,163,74,.4)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        ping: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fade-in 0.4s cubic-bezier(.16,1,.3,1) both",
        "scale-in": "scale-in 0.55s cubic-bezier(.16,1,.3,1) both",
        "slide-right": "slide-right 0.45s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        ping: "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        spin: "spin 0.7s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
