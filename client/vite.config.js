import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Phaser est compilé depuis ses sources : on fixe ses options de compilation
// (comme le fait Phaser lui-même) pour que le code inutile soit retiré.
const PHASER_FLAGS = {
  CANVAS_RENDERER: true, WEBGL_RENDERER: true, WEBGL_DEBUG: false, EXPERIMENTAL: false,
  PLUGIN_3D: false, PLUGIN_CAMERA3D: false, PLUGIN_FBINSTANT: false, FEATURE_SOUND: false,
};
const phaserFlags = {
  name: 'phaser-flags', enforce: 'pre',
  transform(code, id) {
    if (!id.includes('/phaser/src/')) return null;
    let out = code;
    for (const [k, v] of Object.entries(PHASER_FLAGS)) out = out.split(`typeof ${k}`).join(JSON.stringify(v));
    return out === code ? null : { code: out, map: null };
  },
};

export default defineConfig({
  server: { port: 5173, fs: { allow: ['..'] } },
  plugins: [phaserFlags],
  resolve: { alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./src/phaser-leger.js', import.meta.url)) }] },
  build: {
    outDir: 'dist', chunkSizeWarningLimit: 2000,
    // le moteur et le réseau dans des fichiers à part : ils changent rarement, le navigateur les garde en cache
    // quatre pages : l'Arène (index.html), le Conclave des éléments (conclave/), Zone Morte (zone-morte/) et Les Ombres de Baker Street (enquete/)
    rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), conclave: fileURLToPath(new URL('./conclave/index.html', import.meta.url)), zonemorte: fileURLToPath(new URL('./zone-morte/index.html', import.meta.url)), enquete: fileURLToPath(new URL('./enquete/index.html', import.meta.url)) }, output: { manualChunks: (id) => (id.includes('/phaser/') || id.includes('phaser-leger') ? 'phaser' : id.includes('colyseus') ? 'reseau' : undefined) } },
  },
});
