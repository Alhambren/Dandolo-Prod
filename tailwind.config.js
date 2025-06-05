/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        red: '#E63946',
        gold: '#D4AF37',
        white: '#FFFFFF',
        'bg-start': '#050505',
        'bg-end': '#1a0000',
      },
      gradientColorStops: {
        'bg-start': '#050505',
        'bg-end': '#1a0000',
      },
    },
  },
  plugins: [],
}
