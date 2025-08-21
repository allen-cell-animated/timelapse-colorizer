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

  constructor(directoryFiles: Record<string, File>) {
    this.files = directoryFiles;
    this.fileUrls = {};
  }

  resolve(baseUrl: string, url: string): string | null {
    // Remove starting/trailing slashes
    baseUrl = formatPath(baseUrl);
    url = formatPath(url);
    const path = baseUrl !== "" ? baseUrl + "/" + url : url;

    // TODO: Use a nested directory structure to reduce the amount of repeated strings?
    // Split the path, and look for matches in each level of the directory structure
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
