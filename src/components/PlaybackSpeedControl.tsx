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

  // Scale the marks for the slider so that they look linear
  const speedOptions = [0.25, 0.5, 1, 1.5, 2];

  const marks = speedOptions.reduce((acc: Record<string | number, React.ReactNode>, speed, index) => {
    acc[index] = `${speed}x`;
    return acc;
  }, {});

  const onSliderChange = (value: number) => {
    const speedModifier = speedOptions[value];
    const fps = props.baselineFps * speedModifier;
    props.onChange(fps);
  };

  // Convert from raw fps to slider values
  const sliderValue = speedOptions.findIndex((speed) => Math.abs(speed - props.fps / props.baselineFps) < 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
      <h3>Speed:</h3>
      <div style={{ width: "100%" }}>
        <Slider
          marks={marks}
          step={null}
          value={sliderValue}
          onChange={onSliderChange}
          min={0}
          // hide tooltip
          tooltip={{ formatter: null }}
          max={speedOptions.length - 1}
        />
      </div>
    </div>
  );
}
