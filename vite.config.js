import glsl from 'vite-plugin-glsl';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svgr(), glsl(), react()],
  optimizeDeps: {
    // Required; otherwise ffmpeg is not able to access the worker.js files
    // and stalls on load without an error message.
    // (504 Gateway Timeout)
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
},
});
