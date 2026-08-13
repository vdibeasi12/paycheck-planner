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
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
