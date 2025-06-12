/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#FFD700',
          dark: '#B8860B',
          light: '#FFED4E',
        },
        red: {
          DEFAULT: '#DC143C',
          dark: '#8B0000',
          light: '#FF6B6B',
        },
        black: {
          DEFAULT: '#000000',
          light: '#1A1A1A',
          lighter: '#2A2A2A',
        },
        bg: '#000000',
        white: '#FFFFFF',
        'bg-start': '#050505',
        'bg-end': '#1a0000',
      },
      gradientColorStops: {
        'bg-start': '#050505',
        'bg-end': '#1a0000',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
        'gradient-red': 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
        'gradient-black': 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)',
      }
    },
  },
  plugins: [],
}
