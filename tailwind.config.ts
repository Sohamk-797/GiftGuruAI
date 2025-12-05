import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        },
        "float": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -20px, 0)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(30px, -30px, 0) scale(1.05)" },
          "66%": { transform: "translate3d(-20px, 20px, 0) scale(0.95)" }
        },
        "float-medium": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(-25px, 25px, 0) scale(1.03)" },
          "66%": { transform: "translate3d(25px, -15px, 0) scale(0.97)" }
        },
        "float-fast": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "33%": { transform: "translate3d(15px, -25px, 0) rotate(2deg)" },
          "66%": { transform: "translate3d(-15px, 15px, 0) rotate(-2deg)" }
        },
        "spin-once": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" }
        },
        "theme-ripple": {
          "0%": { transform: "translate(50%, -50%) scale(0)", opacity: "1" },
          "70%": { transform: "translate(50%, -50%) scale(1)", opacity: "1" },
          "100%": { transform: "translate(50%, -50%) scale(1)", opacity: "0" }
        },
        "icon-rotate-in": {
          "0%": { transform: "rotate(-90deg) scale(0)", opacity: "0" },
          "100%": { transform: "rotate(0deg) scale(1)", opacity: "1" }
        },
        "icon-rotate-out": {
          "0%": { transform: "rotate(0deg) scale(1)", opacity: "1" },
          "100%": { transform: "rotate(90deg) scale(0)", opacity: "0" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float-slow 25s ease-in-out infinite",
        "float-medium": "float-medium 20s ease-in-out infinite",
        "float-fast": "float-fast 15s ease-in-out infinite",
        "spin-once": "spin-once 0.5s ease-in-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "theme-ripple": "theme-ripple 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "icon-rotate-in": "icon-rotate-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "icon-rotate-out": "icon-rotate-out 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
