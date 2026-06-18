import { Tooltip } from "antd";
import React, { type ReactElement } from "react";

import { CentroidColorMode, ViewMode } from "src/colorizer";
import DropdownWithColorPicker from "src/components/Dropdowns/DropdownWithColorPicker";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { SETTINGS_GAP_PX } from "src/components/Tabs/Settings";
import {
  CENTROID_RADIUS_PX_INPUT_MAX,
  CENTROID_RADIUS_PX_INPUT_MIN,
  CENTROID_RADIUS_PX_SLIDER_MAX,
  CENTROID_RADIUS_PX_SLIDER_MIN,
  MAX_SETTINGS_SLIDER_WIDTH,
} from "src/constants";
import { useViewerStateStore } from "src/state";

type CentroidInnerSettingsProps = {
  idPrefix?: string;
  sliderWidth?: string;
};

const defaultProps: Partial<CentroidInnerSettingsProps> = {
  idPrefix: "",
  sliderWidth: MAX_SETTINGS_SLIDER_WIDTH,
};

const enum CentroidSettingsHtmlIds {
  CENTROID_RADIUS_SLIDER = "centroid-radius-slider",
  CENTROID_MODE_SELECT = "centroid-mode-select",
  CENTROID_OPACITY_SLIDER = "centroid-opacity-slider",
}

const CENTROID_COLOR_MODE_ITEMS = [
  { value: CentroidColorMode.USE_FEATURE_COLOR.toString(), label: "Use feature" },
  { value: CentroidColorMode.USE_CUSTOM_COLOR.toString(), label: "Use color" },
] as const satisfies SelectItem[];

export default function CentroidInnerSettings(inputProps: CentroidInnerSettingsProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const showCentroids = useViewerStateStore((state) => state.showCentroids);
  const centroidRadiusPx = useViewerStateStore((state) => state.centroidRadiusPx);
  const centroidColor = useViewerStateStore((state) => state.centroidColor);
  const centroidColorMode = useViewerStateStore((state) => state.centroidColorMode);
  const centroidOpacity = useViewerStateStore((state) => state.centroidOpacity);
  const setCentroidRadiusPx = useViewerStateStore((state) => state.setCentroidRadiusPx);
  const setCentroidColor = useViewerStateStore((state) => state.setCentroidColor);
  const setCentroidColorMode = useViewerStateStore((state) => state.setCentroidColorMode);
  const setCentroidOpacity = useViewerStateStore((state) => state.setCentroidOpacity);

  const viewMode = useViewerStateStore((state) => state.viewMode);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);

  return (
    <SettingsContainer gapPx={SETTINGS_GAP_PX}>
      <SettingsItem label="Centroid color" htmlFor={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_MODE_SELECT}>
        <DropdownWithColorPicker
          id={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_MODE_SELECT}
          disabled={!showCentroids}
          dropdownProps={{
            items: CENTROID_COLOR_MODE_ITEMS,
            selected: centroidColorMode.toString(),
            onChange: (mode: string) => {
              setCentroidColorMode(Number.parseInt(mode, 10) as CentroidColorMode);
            },
          }}
          showColorPicker={centroidColorMode === CentroidColorMode.USE_CUSTOM_COLOR}
          colorPickerProps={{
            color: centroidColor,
            onChange: setCentroidColor,
          }}
        ></DropdownWithColorPicker>
      </SettingsItem>
      <SettingsItem
        label="Centroid radius"
        htmlFor={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_RADIUS_SLIDER}
        labelStyle={{ marginTop: "1px" }}
      >
        <div style={{ maxWidth: props.sliderWidth, width: props.sliderWidth }}>
          <LabeledSlider
            id={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_RADIUS_SLIDER}
            type="value"
            disabled={!showCentroids}
            step={0.5}
            value={centroidRadiusPx}
            onChange={setCentroidRadiusPx}
            minInputBound={CENTROID_RADIUS_PX_INPUT_MIN}
            maxInputBound={CENTROID_RADIUS_PX_INPUT_MAX}
            minSliderBound={CENTROID_RADIUS_PX_SLIDER_MIN}
            maxSliderBound={CENTROID_RADIUS_PX_SLIDER_MAX}
            numberFormatter={(value) => value?.toFixed(1)}
          />
        </div>
      </SettingsItem>
      {viewMode === ViewMode.VIEW_2D && (
        <SettingsItem label="Opacity" htmlFor={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_OPACITY_SLIDER}>
          <Tooltip
            title="Opacity is only applied when backdrops are enabled"
            open={backdropVisible ? false : undefined}
            placement="top"
          >
            <div style={{ maxWidth: props.sliderWidth, width: props.sliderWidth }}>
              <LabeledSlider
                id={props.idPrefix + CentroidSettingsHtmlIds.CENTROID_OPACITY_SLIDER}
                disabled={!backdropVisible}
                type="value"
                value={centroidOpacity}
                onChange={setCentroidOpacity}
                step={1}
                minSliderBound={0}
                maxSliderBound={100}
                marks={[50]}
                // showInput={false}
                numberFormatter={(value) => value + "%"}
              />
            </div>
          </Tooltip>
        </SettingsItem>
      )}
    </SettingsContainer>
  );
}
