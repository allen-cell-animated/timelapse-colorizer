import { ReactNode } from "react";

import { ViewerStateParams } from "../state/utils/store_io";

import Collection from "../colorizer/Collection";

export type DatasetEntry = {
  name: string;
  description: ReactNode;
  loadParams: ViewerStateParams;
};

export type ProjectEntry = {
  name: string;
  description: ReactNode;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: ViewerStateParams;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};

export type LocationState = {
  collection: Collection;
  datasetKey: string;
};
