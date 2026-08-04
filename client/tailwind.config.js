export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'app-bg': 'var(--app-bg)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'surface-bg': 'var(--surface-bg)',
        'surface-hover': 'var(--surface-hover)',
        'primary-text': 'var(--primary-text)',
        'app-border': 'var(--app-border)',
        'app-border-strong': 'var(--app-border-strong)',
      },
      fontFamily: {
        sans: ['Almarai', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        code: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
