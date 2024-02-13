import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [svgr(), glsl(), react()],
});
