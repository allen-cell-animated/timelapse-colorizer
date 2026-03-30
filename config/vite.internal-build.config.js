import { defineConfig } from "vite";

import { DEFAULT_CONFIG, DEFAULT_ENV } from "../vite.config";

process.env = {
  ...DEFAULT_ENV,
  VITE_INTERNAL_BUILD: "true",
};

export default defineConfig(DEFAULT_CONFIG);
