import { formatPath } from "../utils/url_utils";

import { IPathResolver } from "./IPathResolver";

export class FilePathResolver implements IPathResolver {
  /** Keys are string paths to files, values are File objects. */
  private files: Record<string, File>;
  /** Keys are string paths to files, values are URLs (as created by
   * `URL.createObjectUrl`). Note that this must be cleaned up when the
   * resolver is no longer needed.
   */
  private fileUrls: Record<string, string>;

  /**
   * Creates a new FilePathResolver that can be queried to retrieve File objects
   * from a string relative path.
   * @param fileMap A map from a relative string path to a File object.
   */
  constructor(fileMap: Record<string, File>) {
    this.files = fileMap;
    this.fileUrls = {};
  }

  resolve(baseUrl: string, url: string): string | null {
    // Remove starting/trailing slashes
    baseUrl = formatPath(baseUrl);
    url = formatPath(url);
    const path = baseUrl !== "" ? baseUrl + "/" + url : url;

    if (!this.files[path]) {
      return null;
    }
    if (!this.fileUrls[path]) {
      this.fileUrls[path] = URL.createObjectURL(this.files[path]);
    }
    return this.fileUrls[path];
  }

  cleanup(): void {
    for (const url in this.fileUrls) {
      URL.revokeObjectURL(this.fileUrls[url]);
    }
  }
}
