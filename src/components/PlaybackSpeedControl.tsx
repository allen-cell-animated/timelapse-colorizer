import { Slider } from "antd";
import React, { ReactElement } from "react";
import type { SliderMarks } from "antd/es/slider";

type PlaybackSpeedControlProps = {
  fps: number;
  onChange: (fps: number) => void;
  baselineFps?: number;
};
const defaultProps: Partial<PlaybackSpeedControlProps> = {
  fps: 30,
  onChange: () => {},
  baselineFps: 15,
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
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
      <h3>Speed:</h3>
      <div style={{ width: "100%" }}>
        <Slider
          value={sliderValue}
          onChange={onSliderChange}
          min={0.25}
          max={2}
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
