/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090B10",
        surface: {
          DEFAULT: "#0F131A", // Elevated panel
          card: "#151A23",    // Interactive card
          subtle: "#151A23",
          hover: "#1D232F",
          active: "#262F3E",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          subtle: "rgba(255, 255, 255, 0.03)",
          strong: "rgba(255, 255, 255, 0.12)",
        },
        trade: {
          buy: "#3FB950",
          buyBg: "rgba(63, 185, 80, 0.12)",
          sell: "#F85149",
          sellBg: "rgba(248, 81, 73, 0.12)",
          blue: "#58A6FF",
          blueBg: "rgba(88, 166, 255, 0.12)",
          gold: "#E3B341",
          goldBg: "rgba(227, 179, 65, 0.12)",
          purple: "#BC8CFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        'glow-buy': '0 0 20px rgba(63, 185, 80, 0.25)',
        'glow-sell': '0 0 20px rgba(248, 81, 73, 0.25)',
        'glow-blue': '0 0 20px rgba(88, 166, 255, 0.25)',
        'panel': '0 8px 32px -4px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
};
