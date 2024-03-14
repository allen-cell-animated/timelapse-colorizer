import { UrlParams } from "../colorizer/utils/url_utils";

export type DatasetEntry = {
  name: string;
  description: string;
  loadParams: Partial<UrlParams>;
};

export type ProjectEntry = {
  name: string;
  description: string;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: Partial<UrlParams>;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};
