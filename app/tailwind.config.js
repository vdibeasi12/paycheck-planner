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
      },
    },
  },
  plugins: [],
}