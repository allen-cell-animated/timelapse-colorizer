import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import svgr from "vite-plugin-svgr";

// Add version number and build timestamp to the environment variables
process.env = {
  ...process.env,
  VITE_APP_VERSION: process.env.npm_package_version,
  VITE_BUILD_TIME_UTC: Date.now().toString(),
};

export default defineConfig({
  plugins: [svgr(), glsl(), react()],
});
