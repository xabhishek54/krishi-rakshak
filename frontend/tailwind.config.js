/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shared risk/agricultural palette
        stable: {
          light: '#f4f9f4',
          DEFAULT: '#2e7d32', // green
          dark: '#1b5e20',
        },
        watch: {
          light: '#fffde7',
          DEFAULT: '#fbc02d', // yellow/amber
          dark: '#f57f17',
        },
        elevated: {
          light: '#fff3e0',
          DEFAULT: '#f57c00', // orange
          dark: '#e65100',
        },
        high: {
          light: '#fbe9e7',
          DEFAULT: '#d84315', // light red / orange-red
          dark: '#bf360c',
        },
        critical: {
          light: '#ffebee',
          DEFAULT: '#c62828', // red
          dark: '#880e4f', // dark red
        },
        earth: {
          50: '#faf8f5',
          100: '#f5efe6',
          200: '#e6d8c4',
          800: '#5c4033', // terracotta/brown accents
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
