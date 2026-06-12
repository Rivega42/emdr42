/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Семантические роли дизайн-системы «Лунная ночь» (design/tokens/colors.css).
      // Значения меняются темой через [data-theme="light"] — классы не трогать.
      colors: {
        page: 'var(--bg)',
        deep: 'var(--bg-deep)',
        scene: 'var(--bg-scene)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          soft: 'var(--accent-soft)',
          on: 'var(--on-accent)',
        },
        warm: {
          DEFAULT: 'var(--warm)',
          soft: 'var(--warm-soft)',
          text: 'var(--warm-text)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ok: 'var(--success)',
        attention: 'var(--warning)',
        danger: {
          DEFAULT: 'var(--danger)',
          strong: 'var(--danger-strong)',
          soft: 'var(--danger-soft)',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      fontFamily: {
        sans: ['var(--font-onest)', 'PT Root UI', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-spectral)', 'STIX Two Text', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
