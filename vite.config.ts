import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    target: ['chrome111', 'edge111', 'firefox128', 'safari16.4'],
    // WebKit can retain failed JS modulepreloads even after a page reload.
    // https://bugs.webkit.org/show_bug.cgi?id=270357
    // Dynamic imports and their CSS loading remain handled by Vite.
    modulePreload: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
