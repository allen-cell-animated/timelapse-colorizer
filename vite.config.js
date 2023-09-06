import glsl from 'vite-plugin-glsl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [glsl(), react()]
});
