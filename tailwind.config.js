/** Tailwind config for the Milne Masonry site.
 *  After editing classes in index.html, run: npm run build:css
 */
module.exports = {
  content: ["./index.html"],
  theme: {
    extend: {
      colors: {
        gunmetal: {
          900: "#1a1d23",
          800: "#22262e",
          700: "#2d323c",
          600: "#3d4455",
          500: "#4d566a",
        },
        accent: {
          blue: "#3b82f6",
          blueDark: "#2563eb",
          blueLight: "#60a5fa",
        },
        warm: {
          50: "#faf9f7",
          100: "#f5f3f0",
          200: "#e8e4de",
        },
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
};
