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
        whatsapp: {
          light: "#dcf8c6",
          green: "#25D366",
          dark: "#128C7E",
          teal: "#075E54",
          blue: "#34B7F1",
        },
      },
    },
  },
  plugins: [],
};
export default config;
