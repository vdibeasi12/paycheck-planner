/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Point Tailwind's own `font-sans` utility at the Plus Jakarta Sans
      // variable (set on <body> in app/layout.tsx) instead of Tailwind's
      // default system-font stack. Defensive: nothing currently uses the
      // `font-sans` class, but if anything ever does, this keeps it from
      // silently overriding the site font.
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      // Shave every bold-ish weight down a notch app-wide so headings/labels
      // read lighter against the dark background, without flattening the
      // hierarchy between font-medium/semibold/bold/extrabold. Touches every
      // existing font-semibold/font-bold/font-extrabold usage automatically --
      // no per-component changes needed.
      fontWeight: {
        semibold: "500",
        bold: "600",
        extrabold: "700",
      },
      // Vince: "can you make the font a little more white" -- pushed one
      // more step lighter than the previous pass (which took 400/500 to the
      // old 300/400 values). Now 300/400 both read as the old 200 value and
      // 500 reads as the old 300 value. Borders (gray-700/800) still
      // untouched on purpose so panels don't get washed out.
      colors: {
        gray: {
          300: "#e5e7eb",
          400: "#e5e7eb",
          500: "#d1d5db",
        },
        // Semantic theme tokens (Sep 9 2026, light/dark mode) -- backed by
        // CSS custom properties in app/globals.css, which flip value under
        // [data-theme="dark"]/[data-theme="light"] (set by ThemeProvider) or
        // the prefers-color-scheme media query when no explicit choice is
        // saved yet. Use these for new/migrated surfaces (bg-canvas,
        // bg-surface, text-primary, etc) instead of raw gray-900/slate-900/
        // arbitrary hex, so the same class works in both themes automatically.
        // Named "primary/secondary/muted" (not "text-primary" etc) so the
        // generated utility reads as text-primary/text-secondary/text-muted
        // instead of the doubled-up text-text-primary. Intended for the
        // `text-` utility family only -- bg-primary/border-primary are
        // generated too (Tailwind always generates every utility family for
        // every color in the palette) but aren't meaningful here; don't use them.
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
      },
      borderColor: {
        default: "var(--color-border)",
        subtle: "var(--color-border-subtle)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
