import React, { type ReactElement } from "react";

import CentroidInnerSettings from "src/components/Tabs/Settings/CentroidSettings/CentroidInnerSettings";
import ToggleCollapse from "src/components/ToggleCollapse";
import { useViewerStateStore } from "src/state";

export default function CentroidSettings(): ReactElement {
  const showCentroids = useViewerStateStore((state) => state.showCentroids);
  const setShowCentroids = useViewerStateStore((state) => state.setShowCentroids);

  return (
    <ToggleCollapse label="Centroids" toggleChecked={showCentroids} onToggleChange={setShowCentroids}>
      <CentroidInnerSettings idPrefix="centroid-settings-" />
    </ToggleCollapse>
  );
}
