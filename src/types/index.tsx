import { ReactNode } from "react";

import Collection from "src/colorizer/Collection";
import { ViewerParams } from "src/state/utils/store_io";

export type DatasetEntry = {
  name: string;
  description: ReactNode;
  loadParams: ViewerParams;
};

export type PublicationInfo = {
  url: URL;
  name: string;
  citation: string;
};

export type ProjectEntry = {
  name: string;
  description: ReactNode;
  publicationInfo?: PublicationInfo;
  loadParams?: ViewerParams;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};

export type LocationState = {
  collection: Collection;
  datasetKey: string;
};
