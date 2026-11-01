/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' instead of 'media': with 'media' NativeWind's web runtime throws "Cannot manually set
  // color scheme" on start. src/lib/web-color-scheme.ts keeps the class in sync with the system theme.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Logo orange (src/lib/theme.ts)
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#ff7a00',
          600: '#ea6a00',
          700: '#c25700',
        },
        // Neutral grays instead of the blue-tinted slate, so dark mode is black (brand: orange, white, black).
        slate: require('tailwindcss/colors').neutral,
      },
    },
  },
  plugins: [],
};
