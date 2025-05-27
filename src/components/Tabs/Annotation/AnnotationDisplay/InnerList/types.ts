import { Color } from "three";

import { Dataset, Track } from "../../../../../colorizer";
import { LookupInfo } from "../../../../../colorizer/utils/annotation_utils";

export type AnnotationDisplayInnerListProps = {
  lookupInfo: LookupInfo;
  dataset: Dataset | null;
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};
