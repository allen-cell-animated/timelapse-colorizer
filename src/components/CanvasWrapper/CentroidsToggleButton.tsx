import React, { ReactElement } from "react";

import { AimIconSVG, AimSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

const enum CentroidsToggleButtonHtmlIds {
  RADIUS_SLIDER = "centroids-toggle-radius-slider",
}

export default function CentroidsToggleButton(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const showCentroids = useViewerStateStore((state) => state.showCentroids);
  const centroidRadiusPx = useViewerStateStore((state) => state.centroidRadiusPx);
  const setShowCentroids = useViewerStateStore((state) => state.setShowCentroids);
  const setCentroidRadiusPx = useViewerStateStore((state) => state.setCentroidRadiusPx);

  const configMenuContents = (
    <SettingsContainer style={{ marginBottom: 14 }}>
      <SettingsItem label={"Centroid radius"} htmlFor={CentroidsToggleButtonHtmlIds.RADIUS_SLIDER}>
        <div style={{ width: "220px", display: "flex" }}>
          <LabeledSlider
            type="value"
            id={CentroidsToggleButtonHtmlIds.RADIUS_SLIDER}
            value={centroidRadiusPx}
            onChange={setCentroidRadiusPx}
            minInputBound={0}
            minSliderBound={1}
            maxInputBound={100}
            maxSliderBound={15}
            step={0.5}
            numberFormatter={(value) => value?.toFixed(1)}
          ></LabeledSlider>
        </div>
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name={"centroids"}
      visible={showCentroids}
      setVisible={setShowCentroids}
      disabled={dataset === undefined}
      configMenuContents={configMenuContents}
      settingsLinkText={"Viewer settings > Centroids"}
      enabledIcon={<AimIconSVG />}
      disabledIcon={<AimSlashIconSVG />}
    ></ToggleButtonWithConfig>
  );
}
