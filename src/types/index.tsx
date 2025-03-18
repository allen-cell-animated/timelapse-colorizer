import { ReactNode } from "react";

import { UrlParams } from "../colorizer/utils/url_utils";

import Collection from "../colorizer/Collection";

export type DatasetEntry = {
  name: string;
  description: ReactNode;
  loadParams: Partial<UrlParams>;
};

export type ProjectEntry = {
  name: string;
  description: ReactNode;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: Partial<UrlParams>;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};

export type LocationState = {
  collection: Collection;
  datasetKey: string;
};
