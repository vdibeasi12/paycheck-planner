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
      // Vince: "font still hasn't changed much, should be a little whiter" --
      // the weight tweak above didn't touch color. Most secondary/body text
      // in the app uses text-gray-400 or text-gray-500 (labels, descriptions,
      // helper text). Shift both one step lighter (to what used to be
      // gray-300/gray-400) app-wide. Borders (gray-700/800) are untouched on
      // purpose so panels don't get washed out -- this only affects text.
      colors: {
        gray: {
          400: "#d1d5db",
          500: "#9ca3af",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
