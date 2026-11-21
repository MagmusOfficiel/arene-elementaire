import { defineConfig } from 'vite';

// Une seule page : Les Clans Élémentaires (index.html)
export default defineConfig({
  server: { port: 5173, fs: { allow: ['..'] } },
  build: {
    outDir: 'dist', chunkSizeWarningLimit: 2000,
    // le réseau dans un fichier à part : il change rarement, le navigateur le garde en cache
    rollupOptions: { output: { manualChunks: (id) => (id.includes('colyseus') ? 'reseau' : undefined) } },
  },
});
