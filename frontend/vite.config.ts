// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020', // <--- ¡Asegúrate de que sea 'es2020' o superior!
    outDir: 'dist',
    // ... otras opciones de build
  },
});