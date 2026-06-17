import type { IArrayLoader, ITextureImageLoader } from "src/colorizer/loaders/ILoader";
import type { IPathResolver } from "src/colorizer/path_resolvers";
import type { ReportLoadProgressCallback, ReportWarningCallback } from "src/colorizer/types";

export type DatasetLoadOptions = {
  // Callbacks
  reportProgress?: ReportLoadProgressCallback;
  reportWarning?: ReportWarningCallback;
  // Loaders
  frameLoader?: ITextureImageLoader;
  backdropLoader?: ITextureImageLoader;
  arrayLoader?: IArrayLoader;
  pathResolver?: IPathResolver;
};
