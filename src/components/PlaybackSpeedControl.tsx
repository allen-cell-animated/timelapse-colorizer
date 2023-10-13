import { Slider } from "antd";
import React, { ReactElement } from "react";

import { DEFAULT_PLAYBACK_FPS } from "../constants";

type PlaybackSpeedControlProps = {
  fps: number;
  onChange: (fps: number) => void;
  baselineFps?: number;
  disabled?: boolean;
};
const defaultProps: Partial<PlaybackSpeedControlProps> = {
  fps: 30,
  onChange: () => {},
  baselineFps: DEFAULT_PLAYBACK_FPS,
  disabled: false,
};

export default function PlaybackSpeedControl(inputProps: PlaybackSpeedControlProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<PlaybackSpeedControlProps>;

  const onSliderChange = (value: number) => {
    const fps = value * props.baselineFps;
    props.onChange(fps);
  };

  // Convert from raw fps to slider values
  const sliderValue = props.fps / props.baselineFps;

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
      <h3>Speed:</h3>
      <div style={{ width: "100%" }}>
        <Slider
          value={sliderValue}
          disabled={props.disabled}
          onChange={onSliderChange}
          min={0.25}
          max={2.5}
          step={0.25}
          tooltip={{
            formatter: (value) => {
              return value?.toFixed(2) + "x";
            },
          }}
        />
      </div>
    </div>
  );
}
