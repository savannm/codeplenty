import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration
 * 
 * NOTE: Tailwind v4 is "config-less" by default, but this file is maintained to:
 * 1. Help the Next.js/Turbopack resolver find the 'tailwindcss' package root.
 * 2. Resolve issues with paths containing spaces (e.g., "Savann Mao").
 */
const config: Config = {
  // Define where Tailwind should look for class names in your project
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // You can add custom theme extensions here
    },
  },
  plugins: [
    // Add Tailwind plugins here (e.g., typography, forms)
  ],
};

export default config;

