import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import svgr from "vite-plugin-svgr";

// eslint-disable-next-line @typescript-eslint/naming-convention
process.env = {
  ...process.env,
  VITE_APP_VERSION: process.env.npm_package_version,
  VITE_BUILD_TIME_UTC: Date.now().toString(),
};
export default defineConfig({
  plugins: [svgr(), glsl(), react()],
});
