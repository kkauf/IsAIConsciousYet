/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main UI colors
        background: '#0a0a0a',
        foreground: '#fafaf9',
        border: '#e5e7eb',
        ring: '#a1a1aa',
        
        // Primary and accent colors
        primary: '#10b981', // emerald-500
        'primary-foreground': '#ffffff',
        secondary: '#f3f4f6', // light gray
        'secondary-foreground': '#111827',
        muted: '#f3f4f6',
        'muted-foreground': '#6b7280',
        accent: '#f3f4f6',
        'accent-foreground': '#111827',
        
        // Extended color palette
        emerald: {
          50: '#ecfdf5',
          400: '#34d399',
          500: '#10b981',
        },
        rose: {
          50: '#fff1f2',
          400: '#fb7185',
          500: '#f43f5e',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          400: '#9ca3af',
          600: '#4b5563',
          900: '#111827',
          950: '#030712',
        }
      },
    },
  },
  plugins: [],
}
