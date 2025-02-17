import { create } from "zustand";

import { BackdropSlice, createBackdropSlice } from "./slices/backdrop_slice";
import { CollectionSlice, createCollectionSlice } from "./slices/collection_slice";
import { ColorRampSlice, createColorRampSlice } from "./slices/color_ramp_slice";
import { createDatasetSlice, DatasetSlice } from "./slices/dataset_slice";

// type ViewerStoreState = ColorRampSliceState & {
//   collection: Collection | null;
//   dataset: Dataset | null;
//   datasetKey: string;
//   selectedTrack: Track | null;
//   currentFrame: number;
//   featureKey: string;

//   backdropKey: string | null;
//   annotationState: AnnotationState;

//   featureThresholds: FeatureThreshold[];
//   inRangeLut: Uint8Array;
// };

// type ViewerStoreActions = ColorRampSliceActions & {
//   setCollection: (collection: Collection) => void;
//   setDataset: (dataset: Dataset) => void;
//   setDatasetKey: (datasetKey: string) => void;
//   setSelectedTrack: (track: Track) => void;
//   setCurrentFrame: (frame: number) => void;
//   setFeatureKey: (featureKey: string) => void;

//   setBackdropKey: (key: string | null) => void;
//   setAnnotationState: (state: AnnotationState) => void;
//   setInRangeLut: (lut: Uint8Array) => void;
//   setFeatureThresholds: (thresholds: FeatureThreshold[]) => void;

//   loadFromUrlParams: (urlParams: Partial<UrlParams>) => void;
// };

export const useViewerStateStore = create<CollectionSlice & DatasetSlice & BackdropSlice & ColorRampSlice>()(
  (...a) => ({
    ...createCollectionSlice(...a),
    ...createDatasetSlice(...a),
    ...createBackdropSlice(...a),
    ...createColorRampSlice(...a),
  })
);
