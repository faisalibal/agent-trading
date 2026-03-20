import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Share Tech Mono'", "monospace"],
        display: ["'VT323'", "monospace"],
      },
      colors: {
        terminal: {
          bg: "#0a0e17",
          card: "#111827",
          border: "#1e293b",
          green: "#00ff88",
          red: "#ff3b5c",
          cyan: "#00d4ff",
          yellow: "#ffd700",
          muted: "#64748b",
          text: "#e2e8f0",
        },
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 255, 136, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 255, 136, 0.6)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        pulse_glow: "pulse_glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
