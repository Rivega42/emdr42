import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// При деплое на GitHub Pages base = /<repo-name>/
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const base = process.env.GITHUB_PAGES === '1' && repo ? `/${repo}/` : '/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
