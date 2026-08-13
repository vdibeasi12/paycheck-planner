/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
