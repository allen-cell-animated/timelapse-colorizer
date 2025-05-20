import { ReactNode } from "react";

import { ViewerParams } from "../state/utils/store_io";

import Collection from "../colorizer/Collection";

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
