import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        rr: {
          blue: "#1565FF",
          navy: "#0A1F44",
          green: "#00C853",
          orange: "#FF6D00",
          bg: "#F8FAFC",
          text: "#111827",
          muted: "#6B7280"
        }
      },
      borderRadius: {
        "4xl": "2rem"
      },
      boxShadow: {
        rr: "0 14px 40px rgba(15, 23, 42, 0.08)",
        "rr-blue": "0 12px 26px rgba(21, 101, 255, 0.30)"
      }
    }
  },
  plugins: []
};

export default config;
