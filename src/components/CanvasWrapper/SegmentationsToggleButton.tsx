import React, { type ReactElement } from "react";

import { ImageIconSVG, ImageSlashIconSVG } from "src/assets";
import { ViewMode } from "src/colorizer";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import { SettingsContainer } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

import OpacitySlider from "../Inputs/OpacitySlider";

const enum SegmentationsToggleButtonHtmlIds {
  OPACITY_SLIDER = "segmentations-toggle-opacity-slider",
}

export default function SegmentationsToggleButton(): ReactElement {
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);
  const setShowSegmentations = useViewerStateStore((state) => state.setShowSegmentations);
  const showSegmentations = useViewerStateStore((state) => state.showSegmentations);
  const viewMode = useViewerStateStore((state) => state.viewMode);

  const configMenuContents =
    viewMode !== ViewMode.VIEW_3D ? (
      <div style={{ marginBottom: "14px" }}>
        <SettingsContainer labelWidth="65px" style={{ width: "260px" }}>
          <OpacitySlider
            id={SegmentationsToggleButtonHtmlIds.OPACITY_SLIDER}
            type={"segmentation"}
            value={objectOpacity}
            onChange={setObjectOpacity}
            sliderWidth={"100%"}
          />
        </SettingsContainer>
      </div>
    ) : null;

  return (
    <ToggleButtonWithConfig
      name="segmentations"
      visible={showSegmentations}
      setVisible={setShowSegmentations}
      configMenuContents={configMenuContents}
      settingsLinkText="Viewer settings > Objects"
      visibleIcon={<ImageIconSVG />}
      hiddenIcon={<ImageSlashIconSVG />}
    />
  );
}
