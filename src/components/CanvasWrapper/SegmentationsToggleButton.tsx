import React, { type ReactElement } from "react";

import { ImageIconSVG, ImageSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import OpacitySlider from "src/components/Inputs/OpacitySlider";
import { SettingsContainer } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

const enum SegmentationsToggleButtonHtmlIds {
  OPACITY_SLIDER = "segmentations-toggle-opacity-slider",
}

export default function SegmentationsToggleButton(): ReactElement {
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);
  const setShowSegmentations = useViewerStateStore((state) => state.setShowSegmentations);
  const showSegmentations = useViewerStateStore((state) => state.showSegmentations);

  const configMenuContents = (
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
  );

  return (
    <ToggleButtonWithConfig
      name="segmentations"
      visible={showSegmentations}
      setVisible={setShowSegmentations}
      configMenuContents={configMenuContents}
      settingsLinkText="Viewer settings > Segmentations"
      visibleIcon={<ImageIconSVG />}
      hiddenIcon={<ImageSlashIconSVG />}
    />
  );
}
