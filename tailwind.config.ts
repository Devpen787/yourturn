import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          mark: "var(--brand-mark)",
          schedule: "var(--brand-schedule)",
          motion: "var(--brand-motion)",
          "word-accent": "var(--brand-word-accent)",
          link: "var(--brand-link)",
          canvas: "var(--brand-canvas)",
          "canvas-mid": "var(--brand-canvas-mid)",
        },
      },
      ringColor: {
        "brand-focus": "var(--brand-focus-ring)",
      },
    },
  },
  plugins: [],
};
export default config;
