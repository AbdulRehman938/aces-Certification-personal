import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // screens: {
      //   'short-laptop': { 'raw': '(min-width: 1280px) and (max-width: 1600px) and (max-height: 900px)' },
      // },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#FFFFFF",
        secondary: "#000000",
        gray: "#999999",
        red: "#FF0909",
        "dull-white": "#E0E9F2",
        "dull-red": "#FFCECE",
        yellow: "#FAAB00",
        "dull-yellow": "#FFF7E6",
        green: "#00B448",
        "dull-green": "#F2FFF7",
        pink: "#E7366B",
        "auth-start": "#8E4444",
        "auth-middle": "#2E3552",
        "auth-end": "#0F1527",
        "dull-gray":'#262626',
        'light-gray':"#F6F8FB",
        'light-gray-2':"#e9e9e9"
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
