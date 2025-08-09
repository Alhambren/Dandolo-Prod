/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      colors: {
        // New dark theme primary colors
        bg: {
          primary: '#0A0A0B',
          secondary: '#141416', 
          tertiary: '#1C1C1F',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
        // Updated brand colors for new direction
        brand: {
          primary: '#00D4FF',   // Cyan
          secondary: '#7B3FF2', // Purple
          50: '#fffdf7',
          100: '#fffaed',
          200: '#fff2d4',
          300: '#ffe4b3',
          400: '#ffd680',
          500: '#00D4FF', // Updated primary
          600: '#f4b942',
          700: '#e6a73c',
          800: '#d89536',
          900: '#b8752a',
        },
        // Apple-inspired neutral palette (preserved)
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Apple system colors
        system: {
          blue: '#007AFF',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D92',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#30B0C7',
          yellow: '#FFCC00',
        },
        // Dark mode colors
        dark: {
          1: '#000000',
          2: '#1c1c1e',
          3: '#2c2c2e',
          4: '#3a3a3c',
          5: '#48484a',
          6: '#636366',
        },
        // Legacy support
        gold: {
          DEFAULT: '#ffc947',
          dark: '#b8752a',
          light: '#ffe4b3',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glass-hover': 'glassHover 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms', 
        '500': '500ms',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glassHover: {
          '0%': { 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            transform: 'translateY(0)'
          },
          '100%': { 
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-2px)'
          },
        },
      },
    },
  },
  plugins: [],
}
