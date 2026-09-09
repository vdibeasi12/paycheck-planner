/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Kept in sync with the root tailwind.config.js -- see that file for why.
      fontWeight: {
        semibold: "500",
        bold: "600",
        extrabold: "700",
      },
      colors: {
        gray: {
          300: "#e5e7eb",
          400: "#e5e7eb",
          500: "#d1d5db",
        },
        // Semantic theme tokens -- kept in sync with the root
        // tailwind.config.js, see that file for the full explanation.
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        emphasis: "var(--color-text-emphasis)",
        // Kept in sync with the root tailwind.config.js -- see that file.
        brand: {
          DEFAULT: "var(--color-brand)",
          light: "var(--color-brand-light)",
          dark: "var(--color-brand-dark)",
        },
        warning: {
          DEFAULT: "var(--color-warning-bg)",
          border: "var(--color-warning-border)",
          heading: "var(--color-warning-heading)",
        },
      },
      borderColor: {
        default: "var(--color-border)",
        subtle: "var(--color-border-subtle)",
      },
    },
  },
  plugins: [],
}