/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f7f5',
          100: '#e3ece6',
          200: '#ccdbd0',
          800: '#2d3e35',
        },
        dermal: {
          safe: '#10b981',     // Green
          moderate: '#f59e0b', // Amber
          risk: '#ef4444',     // Red
        }
      }
    },
  },
  plugins: [],
}