import { Tooltip } from "antd";
import React, { type ReactElement } from "react";

import { ImageIconSVG, ImageSlashIconSVG } from "src/assets";
import { ViewMode } from "src/colorizer";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

const enum SegmentationsToggleButtonHtmlIds {
  OPACITY_SLIDER = "segmentations-toggle-opacity-slider",
}

export default function SegmentationsToggleButton(): ReactElement {
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);
  const setShowSegmentations = useViewerStateStore((state) => state.setShowSegmentations);
  const showSegmentations = useViewerStateStore((state) => state.showSegmentations);
  const viewMode = useViewerStateStore((state) => state.viewMode);

  const configMenuContents =
    viewMode !== ViewMode.VIEW_3D ? (
      <div style={{ marginBottom: "14px" }}>
        <SettingsContainer labelWidth="65px" style={{ width: "240px" }}>
          <SettingsItem
            label="Opacity"
            htmlFor={SegmentationsToggleButtonHtmlIds.OPACITY_SLIDER}
            style={{ marginBottom: 14 }}
          >
            <Tooltip
              title="Segmentation opacity is only applied when backdrops are enabled"
              open={backdropVisible ? false : undefined}
              placement="top"
            >
              <div style={{ display: "flex", flexGrow: 1 }}>
                <LabeledSlider
                  id={SegmentationsToggleButtonHtmlIds.OPACITY_SLIDER}
                  disabled={!backdropVisible}
                  type="value"
                  value={objectOpacity}
                  onChange={setObjectOpacity}
                  step={1}
                  minSliderBound={0}
                  maxSliderBound={100}
                  marks={[50]}
                  showInput={false}
                  numberFormatter={(value) => value + "%"}
                />
              </div>
            </Tooltip>
          </SettingsItem>
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
