import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // TODO: Currently 404.html imports all of the same JS chunks as index.html.
        // Can we make it so that 404.html only imports `gh_404.js` chunks?
        
        // eslint-disable-next-line no-undef
        main: resolve(__dirname, 'index.html'),
        // eslint-disable-next-line no-undef
        "404": resolve(__dirname, '404.html')
      }
    }
  },
  plugins: [svgr(), glsl(), react()],
});
