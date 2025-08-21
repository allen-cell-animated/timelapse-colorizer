import { convertAllenPathToHttps, formatPath, isAllenPath } from "../utils/url_utils";

import { IPathResolver } from "./IPathResolver";

export class UrlPathResolver implements IPathResolver {
  resolve(baseUrl: string, url: string): string | null {
    baseUrl = formatPath(baseUrl);
    url = formatPath(url);

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    } else if (isAllenPath(url)) {
      const newUrl = convertAllenPathToHttps(url);
      if (newUrl) {
        return newUrl;
      } else {
        throw new Error(
          `Error while resolving path: Allen filepath '${url}' was detected but could not be converted to an HTTPS URL.` +
            ` This may be because the file is in a directory that is not publicly servable.`
        );
      }
    } else {
      return `${baseUrl}/${url}`;
    }
  }

  cleanup(): void {
    // Nothing to clean up
  }
}
