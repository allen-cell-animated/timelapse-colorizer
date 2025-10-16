import { type PresetsItem } from "antd/es/color-picker/interface";
import React, { type ReactElement, useRef } from "react";
import styled from "styled-components";
import { Color as ThreeColor } from "three";

import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { FlexRowAlignCenter } from "src/styles/utils";

import SelectionDropdown from "./SelectionDropdown";

type DropdownWithColorPickerProps = {
  selected: string;
  items: { value: string; label: string }[];
  id?: string;
  onValueChange: (mode: string) => void;
  color: ThreeColor;
  disabled?: boolean;
  showColorPicker?: boolean;
  presets?: PresetsItem[];
  /** Alpha value, in the [0, 1] range. */
  alpha?: number;
  onColorChange: (color: ThreeColor, alpha: number) => void;
};

const defaultProps: Partial<DropdownWithColorPickerProps> = {
  disabled: false,
  showColorPicker: true,
};

const HorizontalDiv = styled(FlexRowAlignCenter)`
  gap: 6px;
  flex-direction: row;
  flex-wrap: wrap;
`;

/**
 * Reusable convenience dropdown component with an optional color picker.
 */
export default function DropdownWithColorPicker(propsInput: DropdownWithColorPickerProps): ReactElement {
  const props = { ...defaultProps, ...propsInput };

  const colorPickerRef = useRef<HTMLParagraphElement>(null);

  const showAlpha = props.alpha !== undefined;
  let colorHexString = props.color.getHexString();
  if (showAlpha && props.alpha !== undefined) {
    colorHexString += Math.round(props.alpha * 255)
      .toString(16)
      .padStart(2, "0");
  }

  return (
    <HorizontalDiv ref={colorPickerRef}>
      <SelectionDropdown
        label={null}
        id={props.id}
        selected={props.selected.toString()}
        items={props.items}
        showSelectedItemTooltip={false}
        onChange={props.onValueChange}
        disabled={props.disabled}
        width={"105px"}
      ></SelectionDropdown>
      <WrappedColorPicker
        containerStyle={{
          visibility: props.showColorPicker ? "visible" : "hidden",
          opacity: props.showColorPicker ? "1" : "0",
          // Copied from Ant transition styles
          transition: "visibility 0s, opacity 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
        }}
        size="small"
        disabledAlpha={!showAlpha}
        defaultValue={colorHexString}
        value={colorHexString}
        presets={props.presets}
        // onChange returns a different color type, so must convert from hex
        onChange={(color, _cssColor) => {
          const hex = color.toHexString().slice(0, 7); // Remove alpha if present
          const alpha = color.toRgb().a;
          props.onColorChange(new ThreeColor(hex), alpha);
        }}
        disabled={props.disabled}
      />
    </HorizontalDiv>
  );
}
