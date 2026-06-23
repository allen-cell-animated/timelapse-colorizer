import { Tooltip } from "antd";
import React, { type ReactElement } from "react";

import { ViewMode } from "src/colorizer/types";
import { SettingsItem } from "src/components/SettingsContainer";
import { MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { useViewerStateStore } from "src/state";

import LabeledSlider from "./LabeledSlider";

type OpacitySliderProps = {
  type: "segmentation" | "centroid";
  id?: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  sliderWidth?: string;
  style?: React.CSSProperties;
};

const defaultProps = {
  disabled: false,
  sliderWidth: MAX_SETTINGS_SLIDER_WIDTH,
  style: {},
};

/**
 * Convenience component for an opacity slider for either segmentations or
 * centroids. Handles enabling/disabling based on the current view mode and
 * visibility of channels or backdrops.
 */
export default function OpacitySlider(inputProps: OpacitySliderProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const viewMode = useViewerStateStore((state) => state.viewMode);

  const enableOpacityControl = viewMode === ViewMode.VIEW_2D && backdropVisible;

  const htmlId = props.id ?? props.type + "-opacity-slider";
  const tooltipLabel = props.type.charAt(0).toUpperCase() + props.type.slice(1);

  return (
    <SettingsItem label="Opacity" htmlFor={htmlId} style={{ marginBottom: 14 }}>
      <Tooltip
        title={`${tooltipLabel} opacity is only applied when ${
          viewMode === ViewMode.VIEW_3D ? "channels" : "backdrops"
        } are enabled`}
        open={enableOpacityControl ? false : undefined}
        placement="top"
      >
        <div style={{ display: "flex", width: props.sliderWidth, maxWidth: props.sliderWidth }}>
          <LabeledSlider
            id={htmlId}
            disabled={props.disabled || !enableOpacityControl}
            type="value"
            value={props.value}
            onChange={props.onChange}
            step={1}
            minSliderBound={0}
            maxSliderBound={100}
            marks={[50]}
            showInput={true}
            numberFormatter={(value) => value + "%"}
          />
        </div>
      </Tooltip>
    </SettingsItem>
  );
}
