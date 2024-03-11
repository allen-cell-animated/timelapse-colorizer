export type DatasetEntry = {
  name: string;
  description: string;
  loadLink: string;
};

export type ProjectEntry = {
  name: string;
  description: string;
  publicationLink?: URL;
  publicationName?: string;
  loadLink?: string;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};
