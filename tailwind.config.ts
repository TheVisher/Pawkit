import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#3b82f6"
      }
    }
  },
  plugins: [
    require("@tailwindcss/typography")
  ]
};

export default config;
