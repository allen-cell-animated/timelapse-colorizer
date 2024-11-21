import { defineConfig } from "vite";

import { DEFAULT_ENV } from "../vite.config";
import { DEFAULT_CONFIG } from "../vite.config";

process.env = {
  ...DEFAULT_ENV,
  VITE_INTERNAL_BUILD: "true",
};

export default defineConfig(DEFAULT_CONFIG);
