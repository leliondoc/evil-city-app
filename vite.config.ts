import {fileURLToPath,URL} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {alias: {'@':fileURLToPath(new URL('.',import.meta.url))}},
  css: {postcss: {plugins: [tailwindcss()]}},
  build: {outDir:'dist',emptyOutDir:true},
});
