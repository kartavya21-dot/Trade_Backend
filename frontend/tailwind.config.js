/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#0F0F12",
        cardbg: "#18181C",
        cardborder: "#26262E",
        accentTeal: "#00F2FE",
        accentViolet: "#4FACFE"
      }
    },
  },
  plugins: [],
}
