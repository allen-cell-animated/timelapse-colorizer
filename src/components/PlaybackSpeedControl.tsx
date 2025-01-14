import React, { ReactElement } from "react";

import { DEFAULT_PLAYBACK_FPS } from "../constants";

import SelectionDropdown from "./Dropdowns/SelectionDropdown";

type PlaybackSpeedControlProps = {
  fps: number;
  onChange: (fps: number) => void;
  baselineFps?: number;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};
const defaultProps: Partial<PlaybackSpeedControlProps> = {
  baselineFps: DEFAULT_PLAYBACK_FPS,
  disabled: false,
  min: 0.25,
  max: 2.5,
  step: 0.25,
};

export default function PlaybackSpeedControl(inputProps: PlaybackSpeedControlProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<PlaybackSpeedControlProps>;

  const onSliderChange = (value: number): void => {
    const fps = value * props.baselineFps;
    props.onChange(fps);
  };

  // Generate values for the dropdown
  const dropdownItems = [];
  for (let i = props.min; i < props.max; i += props.step) {
    dropdownItems.push({ value: i.toFixed(2), label: i.toFixed(2) + "x" });
  }

  // Convert from raw fps to slider values
  const sliderValue = props.fps / props.baselineFps;

  return (
    <SelectionDropdown
      width="80px"
      label={"Speed"}
      selected={sliderValue.toFixed(2)}
      items={dropdownItems}
      onChange={(key: string) => onSliderChange(parseFloat(key))}
      showSelectedItemTooltip={false}
    ></SelectionDropdown>
  );
}
