import { FilePathResolver } from "./FilePathResolver";
import type { IPathResolver as IPathResolverType } from "./IPathResolver";
import { UrlPathResolver } from "./UrlPathResolver";

export type IPathResolver = IPathResolverType;
export { FilePathResolver, UrlPathResolver };
