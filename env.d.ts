declare const APP_VERSION: string;
declare const BUILD_TIME_UTC: number;

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly npm_package_version: string;
    }
  }
}
