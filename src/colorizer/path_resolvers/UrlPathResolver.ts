import { resolveUrl } from "src/colorizer/utils/url_utils";

import { IPathResolver } from "./IPathResolver";

export class UrlPathResolver implements IPathResolver {
  resolve(baseUrl: string, url: string): string {
    return resolveUrl(baseUrl, url);
  }

  cleanup(): void {}
}
