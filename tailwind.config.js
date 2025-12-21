/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary brand color (Sky → Dracula Cyan for dark mode)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Main brand color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        // Dark mode overrides for primary
        'primary-dark': {
          50: '#1e2029',
          100: '#282a36',  // Dracula background
          200: '#44475a',  // Dracula current line
          300: '#6272a4',  // Dracula comment
          400: '#8be9fd',  // Dracula cyan
          500: '#8be9fd',  // Main (same as 400)
          600: '#6be4f5',
          700: '#4dd9ed',
          800: '#2fcee5',
          900: '#1ec3dd',
        },

        // Neutral colors (Gray → Dracula Background System for dark mode)
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        'neutral-dark': {
          50: '#44475a',  // Dracula current line
          100: '#3a3c4d',
          200: '#353745',
          300: '#44475a',
          400: '#6272a4',  // Dracula comment
          500: '#8892b0',
          600: '#a8b1d3',
          700: '#c9d1e8',
          800: '#e0e6f5',
          900: '#f8f8f2',  // Dracula foreground
        },

        // Success (Green → Dracula Green for dark mode)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#4ade80',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },

        'success-dark': {
          50: '#1a2e1f',
          100: '#234d2b',
          200: '#2d6c38',
          400: '#50fa7b',  // Dracula green
          600: '#50fa7b',
          700: '#3dd964',
          800: '#2ab84d',
        },

        // Error/Danger (Red → Dracula Red for dark mode)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },

        'error-dark': {
          50: '#2e1a1a',
          100: '#4d2323',
          200: '#6c2d2d',
          400: '#ff5555',  // Dracula red
          500: '#ff5555',
          600: '#ff6b6b',
          700: '#ff8181',
          800: '#ff9797',
        },

        // Warning (Yellow → Dracula Yellow for dark mode)
        warning: {
          50: '#fefce8',
          600: '#ca8a04',
        },

        'warning-dark': {
          50: '#2e2d1a',
          600: '#f1fa8c',  // Dracula yellow
        },

        // Info (Blue → Dracula Purple for dark mode)
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        'info-dark': {
          50: '#241f30',
          100: '#362d4a',
          200: '#483b64',
          300: '#5a4d7e',
          600: '#bd93f9',  // Dracula purple
          700: '#c9a4fa',
          800: '#d5b5fb',
          900: '#e1c6fc',
        },

        // Surface colors
        surface: {
          base: '#ffffff',
          elevated: '#f3f4f6',
        },

        'surface-dark': {
          base: '#282a36',      // Dracula background
          elevated: '#313340',
        },

        // Dracula theme colors for direct reference
        dracula: {
          background: '#282a36',
          foreground: '#f8f8f2',
          currentLine: '#44475a',
          comment: '#6272a4',
          cyan: '#8be9fd',
          green: '#50fa7b',
          orange: '#ffb86c',
          pink: '#ff79c6',
          purple: '#bd93f9',
          red: '#ff5555',
          yellow: '#f1fa8c',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
}
