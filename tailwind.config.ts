import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "rgb(var(--fg-primary) / <alpha-value>)",
          primaryLight: "rgb(var(--fg-primary-light) / <alpha-value>)",
          accent: "rgb(var(--fg-accent) / <alpha-value>)",
          secondary: "rgb(var(--fg-secondary) / <alpha-value>)",
          ink: "rgb(var(--fg-ink) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          background: "rgb(var(--fg-background) / <alpha-value>)",
          surface: "rgb(var(--fg-surface) / <alpha-value>)",
          border: "rgb(var(--fg-border) / <alpha-value>)",
        },
        status: {
          success: "rgb(var(--status-success) / <alpha-value>)",
          successBg: "rgb(var(--status-success-bg) / <alpha-value>)",
          warning: "rgb(var(--status-warning) / <alpha-value>)",
          warningBg: "rgb(var(--status-warning-bg) / <alpha-value>)",
          error: "rgb(var(--status-error) / <alpha-value>)",
          errorBg: "rgb(var(--status-error-bg) / <alpha-value>)",
          // legacy aliases kept during the visual redesign so any
          // not-yet-updated component reference doesn't break the build
          green: "rgb(var(--status-success) / <alpha-value>)",
          greenBg: "rgb(var(--status-success-bg) / <alpha-value>)",
          amber: "rgb(var(--status-warning) / <alpha-value>)",
          amberBg: "rgb(var(--status-warning-bg) / <alpha-value>)",
          red: "rgb(var(--status-error) / <alpha-value>)",
          redBg: "rgb(var(--status-error-bg) / <alpha-value>)",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      maxWidth: {
        app: "720px",
        wide: "1180px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,61,0.06), 0 8px 24px -12px rgba(15,27,61,0.12)",
        floating: "0 20px 60px -12px rgba(15,27,61,0.25)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(var(--rotate, 0deg))" },
          "50%": { transform: "translateY(-6px) rotate(var(--rotate, 0deg))" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.2s ease-out both",
        "float-slow": "float-slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
