/** Resolves paths when loading files from a manifest or collection. */
export interface IPathResolver {
  resolve(basePath: string, path: string): string | null;
  cleanup(): void;
}
