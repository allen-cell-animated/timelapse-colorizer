import { formatPath, isAllenPath, isUrl, resolveUrl } from "src/colorizer/utils/url_utils";

import { type IPathResolver } from "./IPathResolver";

/**
 * Creates and manages object URLs for a collection of files, allowing paths to
 * be resolved to files that can be fetched.
 */
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

  /**
   * Returns a URL of either a local file or a remote resource. Returns `null`
   * if the path could not be resolved to an existing file.
   */
  resolve(basePath: string, path: string): string | null {
    // Remove starting/trailing slashes
    basePath = formatPath(basePath);
    path = formatPath(path);

    // Check for URL paths and return those directly
    if (isUrl(path) || isUrl(basePath) || isAllenPath(path) || isAllenPath(basePath)) {
      return resolveUrl(basePath, path);
    }

    // Return a file URL if the file exists.
    const joinedPath = basePath !== "" ? basePath + "/" + path : path;
    if (!this.files[joinedPath]) {
      return null;
    }
    if (!this.fileUrls[joinedPath]) {
      this.fileUrls[joinedPath] = URL.createObjectURL(this.files[joinedPath]);
    }
    return this.fileUrls[joinedPath];
  }

  cleanup(): void {
    for (const url in this.fileUrls) {
      URL.revokeObjectURL(this.fileUrls[url]);
    }
  }
}
