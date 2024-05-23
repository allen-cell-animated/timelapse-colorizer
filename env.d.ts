/// <reference types="vite/client" />

interface ImportMetaEnv {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_APP_VERSION: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BUILD_TIME_UTC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly npm_package_version: string;
    }
  }
}
