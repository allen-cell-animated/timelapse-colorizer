import React, { type ReactElement } from "react";

import { CentroidIconSVG, CentroidSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import CentroidInnerSettings from "src/components/Tabs/Settings/CentroidSettings/CentroidInnerSettings";
import { useViewerStateStore } from "src/state";

export default function CentroidsToggleButton(): ReactElement {
  const showCentroids = useViewerStateStore((state) => state.showCentroids);
  const setShowCentroids = useViewerStateStore((state) => state.setShowCentroids);

  const configMenuContents = (
    <div style={{ marginBottom: "14px" }}>
      <CentroidInnerSettings idPrefix={"centroids-toggle-"} sliderWidth="220px" />
    </div>
  );

  return (
    <ToggleButtonWithConfig
      name={"centroids"}
      visible={showCentroids}
      setVisible={setShowCentroids}
      configMenuContents={configMenuContents}
      settingsLinkText={"Viewer settings > Objects"}
      visibleIcon={<CentroidIconSVG />}
      hiddenIcon={<CentroidSlashIconSVG />}
    ></ToggleButtonWithConfig>
  );
}
