/** @type {import('tailwindcss').Config} */
// Palette taken from the app's app_theme.dart (primary #AA8FFF).
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary purple scale  (primary20 … primary2 in app_theme.dart)
        brand: {
          DEFAULT: "#AA8FFF", // primary
          50: "#F6F4FF", // primary20
          100: "#E5DDFF", // progressbarColor
          200: "#D0C1FF", // primary30
          300: "#C4B5FD", // lightPurple
          400: "#AA8FFF", // primary  ← main brand colour
          500: "#8E75DD", // primary50
          600: "#745EBB", // primary60 (links / text on white)
          700: "#5C4899", // primary70
          800: "#453577", // primary80
          900: "#2F2355", // primary90
          950: "#1A0826", // primary2 / dark
        },
        // Neutrals: purple-tinted greys from the app's grey / dark scales
        slate: {
          50: "#FDFBFF", // grey30
          100: "#F6F4FF", // primary20
          200: "#E8E0FA",
          300: "#D8CCFF", // profileColor
          400: "#A991B7", // grey70
          500: "#7A6588", // darker grey80 (AA contrast on white)
          600: "#685473", // grey90
          700: "#483951", // grey
          800: "#2E1F37", // cardColor
          900: "#1A0826", // dark / primary2
        },
        // Status colours (red / green / pending + their tints from the app)
        success: { DEFAULT: "#48DD6D", tint: "#C2F4D0", ink: "#14532D" },
        warn: { DEFAULT: "#FAB01F", tint: "#FFF4DE", ink: "#7A4B00" },
        danger: { DEFAULT: "#FF4D5F", tint: "#FBD6D9", ink: "#A3122A" },
      },
    },
  },
  plugins: [],
};
