import React, { ReactElement } from "react";

import { CentroidIconSVG, CentroidSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import {
  CENTROID_RADIUS_PX_INPUT_MAX,
  CENTROID_RADIUS_PX_INPUT_MIN,
  CENTROID_RADIUS_PX_SLIDER_MAX,
  CENTROID_RADIUS_PX_SLIDER_MIN,
} from "src/constants";
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
            minInputBound={CENTROID_RADIUS_PX_INPUT_MIN}
            maxInputBound={CENTROID_RADIUS_PX_INPUT_MAX}
            minSliderBound={CENTROID_RADIUS_PX_SLIDER_MIN}
            maxSliderBound={CENTROID_RADIUS_PX_SLIDER_MAX}
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
      settingsLinkText={"Viewer settings > Objects"}
      visibleIcon={<CentroidIconSVG />}
      hiddenIcon={<CentroidSlashIconSVG />}
    ></ToggleButtonWithConfig>
  );
}
