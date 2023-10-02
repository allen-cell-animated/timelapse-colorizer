import glsl from 'vite-plugin-glsl';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svgr(), glsl(), react()],
});
