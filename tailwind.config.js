/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cal: {
          bg: 'var(--cal-bg)',
          'bg-subtle': 'var(--cal-bg-subtle)',
          'bg-muted': 'var(--cal-bg-muted)',
          'bg-emphasis': 'var(--cal-bg-emphasis)',
          'bg-inverted': 'var(--cal-bg-inverted)',
          'bg-info': 'var(--cal-bg-info)',
          'bg-success': 'var(--cal-bg-success)',
          'bg-attention': 'var(--cal-bg-attention)',
          'bg-error': 'var(--cal-bg-error)',
          text: 'var(--cal-text)',
          'text-muted': 'var(--cal-text-muted)',
          'text-subtle': 'var(--cal-text-subtle)',
          'text-inverted': 'var(--cal-text-inverted)',
          border: 'var(--cal-border)',
          'border-emphasis': 'var(--cal-border-emphasis)',
          success: 'var(--cal-success)',
          warning: 'var(--cal-warning)',
          error: 'var(--cal-error)',
          info: 'var(--cal-info)',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
