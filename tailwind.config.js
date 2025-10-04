/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // must be 'class' for toggle to work
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},

  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
