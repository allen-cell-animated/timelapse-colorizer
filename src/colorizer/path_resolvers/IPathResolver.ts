/** Resolves paths when loading files from a manifest or collection. */
export interface IPathResolver {
  resolve(baseUrl: string, url: string): string | null;
  cleanup(): void;
}
