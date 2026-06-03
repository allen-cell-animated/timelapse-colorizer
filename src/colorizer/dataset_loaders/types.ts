import type { IArrayLoader, ITextureImageLoader } from "src/colorizer/loaders/ILoader";
import type { IPathResolver } from "src/colorizer/path_resolvers";
import type { ReportLoadProgressCallback, ReportWarningCallback } from "src/colorizer/types";

export type DatasetLoadOptions = {
  reportProgress?: ReportLoadProgressCallback;
  reportWarning?: ReportWarningCallback;

  frameLoader?: ITextureImageLoader;
  arrayLoader?: IArrayLoader;
  pathResolver?: IPathResolver;
};
