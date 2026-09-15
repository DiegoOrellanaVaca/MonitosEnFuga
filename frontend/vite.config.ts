import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * En desarrollo el frontend corre en el puerto 5173 y redirige las peticiones
 * /api al backend (puerto 3001). En produccion no hace falta proxy porque
 * Express sirve esta misma carpeta compilada.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist'
  }
});
