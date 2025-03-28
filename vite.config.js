import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import svgr from "vite-plugin-svgr";

// Add version number and build timestamp to the environment variables
export const DEFAULT_ENV = {
  ...process.env,
  VITE_APP_VERSION: process.env.npm_package_version,
  VITE_BUILD_TIME_UTC: Date.now().toString(),
};

process.env = DEFAULT_ENV;

export const DEFAULT_CONFIG = {
  build: {
    // This quiets the "module has been externalized for browser compatibility" warnings that
    // vite throws when building for production.
    // commonjsOptions: {
    //   // Ignore built-in modules in Node.js. Fix copied from the workerpool documentation:
    //   // https://github.com/josdejong/workerpool/blob/master/examples/vite/vite.config.ts
    //   ignore: ["os", "child_process", "worker_threads"],
    // },
    rollupOptions: {
      input: {
        // TODO: Currently 404.html imports all of the same JS chunks as index.html.
        // Can we make it so that 404.html only imports `gh_404.js` chunks?

        // eslint-disable-next-line no-undef
        main: resolve(__dirname, "index.html"),
        // eslint-disable-next-line no-undef
        404: resolve(__dirname, "404.html"),
      },
    },
  },
  optimizeDeps: {
    // vole-core uses a worker imported via local import (e.g. new
    // URL('./local-worker.js', import.meta.url)). If vite bundles the worker,
    // vole-core will not be able to find it at runtime. We exclude vole-core
    // from dependency optimization here.
    exclude: ["@aics/vole-core"],
    // Have to still optimize all CommonJS dependencies of vole-core. See
    // https://vite.dev/config/dep-optimization-options#optimizedeps-exclude
    include: ["@aics/vole-core > tweakpane", "@aics/vole-core > geotiff", "@aics/vole-core > throttled-queue"],
  },
  plugins: [svgr(), glsl(), react()],
};

export default defineConfig(DEFAULT_CONFIG);
