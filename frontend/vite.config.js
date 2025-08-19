import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    modules: false,  // ← Asegurar que CSS modules esté desactivado
  },
  build: {
    cssCodeSplit: true,  // ← Esto permite que los CSS se procesen
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: true
  }
})