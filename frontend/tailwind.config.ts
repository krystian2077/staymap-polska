import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#16a34a",
          dark: "#0a2e1a",
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
        ink: {
          DEFAULT: "#0a0f0d",
          2: "#3d4f45",
          3: "#7a8f84",
          4: "#b4c4bc",
        },
        surface: {
          DEFAULT: "#ffffff",
          2: "#f8faf9",
          3: "#f2f7f4",
        },
        text: {
          DEFAULT: "#0a0f0d",
          secondary: "#3d4f45",
          muted: "#7a8f84",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "var(--font-dm)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4": "4px",
        "6": "6px",
        "8": "8px",
        "10": "10px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "20": "20px",
        "24": "24px",
        "28": "28px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,.06)",
        elevated: "0 4px 16px rgba(0,0,0,.08)",
        hover: "0 16px 40px rgba(0,0,0,.1)",
        brand: "0 0 0 3px rgba(22,163,74,.18)",
        "brand-lg": "0 8px 20px rgba(22,163,74,.4)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        badgePop: {
          "0%": { transform: "scale(0) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(1.12) rotate(2deg)" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        pulse: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".3" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        orb1: {
          "0%,100%": { transform: "translate(0,0)" },
          "40%": { transform: "translate(40px,-24px)" },
          "70%": { transform: "translate(-14px,20px)" },
        },
        orb2: {
          "0%,100%": { transform: "translate(0,0)" },
          "35%": { transform: "translate(-28px,22px)" },
          "65%": { transform: "translate(18px,-26px)" },
        },
      },
      animation: {
        "fade-up": "fadeUp .65s cubic-bezier(.16,1,.3,1) both",
        "scale-in": "scaleIn .55s cubic-bezier(.16,1,.3,1) both",
        "badge-pop": "badgePop .7s cubic-bezier(.34,1.56,.64,1) .1s both",
        "pulse-dot": "pulse 2.2s ease-in-out infinite",
        marquee: "marquee 35s linear infinite",
        orb1: "orb1 16s ease-in-out infinite",
        orb2: "orb2 20s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
