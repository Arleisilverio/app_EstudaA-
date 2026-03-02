import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#FAF6F1",
        foreground: "#3E2C23",
        study: {
          primary: "#8B5E3C",
          medium: "#A67C52",
          light: "#F3E8DC",
          dark: "#3E2C23",
        },
        primary: {
          DEFAULT: "#8B5E3C",
          foreground: "#FAF6F1",
        },
        secondary: {
          DEFAULT: "#A67C52",
          foreground: "#FAF6F1",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#F3E8DC",
          foreground: "#A67C52",
        },
        accent: {
          DEFAULT: "#F3E8DC",
          foreground: "#8B5E3C",
        },
        popover: {
          DEFAULT: "#FAF6F1",
          foreground: "#3E2C23",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#3E2C23",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        'study': '0 4px 20px -2px rgba(139, 94, 60, 0.1), 0 2px 10px -2px rgba(139, 94, 60, 0.05)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;