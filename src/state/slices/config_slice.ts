import { Color } from "three";
import { StateCreator } from "zustand";

import {
  DrawMode,
  DrawSettings,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
  TabType,
} from "../../colorizer";

type ConfigSliceState = {
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  showLegendDuringExport: boolean;
  showHeaderDuringExport: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  outlineColor: Color;
  openTab: TabType;
};

type ConfigSliceActions = {
  setShowTrackPath: (showTrackPath: boolean) => void;
  setShowScaleBar: (showScaleBar: boolean) => void;
  setShowTimestamp: (showTimestamp: boolean) => void;
  setShowLegendDuringExport: (showLegendDuringExport: boolean) => void;
  setShowHeaderDuringExport: (showHeaderDuringExport: boolean) => void;
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (outlierDrawSettings: DrawSettings) => void;
  setOutlineColor: (outlineColor: Color) => void;
  setOpenTab: (openTab: TabType) => void;
};

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  // State
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  outOfRangeDrawSettings: {
    color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
    mode: DrawMode.USE_COLOR,
  },
  outlierDrawSettings: {
    color: new Color(OUTLIER_COLOR_DEFAULT),
    mode: DrawMode.USE_COLOR,
  },
  outlineColor: new Color(OUTLINE_COLOR_DEFAULT),
  openTab: TabType.TRACK_PLOT,

  // Actions
  setShowTrackPath: (showTrackPath) => set({ showTrackPath }),
  setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
  setShowTimestamp: (showTimestamp) => set({ showTimestamp }),
  setShowLegendDuringExport: (showLegendDuringExport) => set({ showLegendDuringExport }),
  setShowHeaderDuringExport: (showHeaderDuringExport) => set({ showHeaderDuringExport }),
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings) => set({ outOfRangeDrawSettings }),
  setOutlierDrawSettings: (outlierDrawSettings) => set({ outlierDrawSettings }),
  setOutlineColor: (outlineColor) => set({ outlineColor }),
  setOpenTab: (openTab) => set({ openTab }),
});
