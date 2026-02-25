import type { PresetsItem } from "antd/es/color-picker/interface";
import React, { type ReactElement, useRef } from "react";
import styled from "styled-components";
import { Color as ThreeColor } from "three";

import { DEFAULT_COLOR_RAMP_KEY, DISPLAY_COLOR_RAMP_KEYS } from "src/colorizer";
import ColorRampDropdown, { ColorRampSelectionProps } from "src/components/Dropdowns/ColorRampDropdown";
import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { FlexRow, FlexRowAlignCenter } from "src/styles/utils";

import SelectionDropdown, { SelectionDropdownProps } from "./SelectionDropdown";

type DropdownWithColorPickerProps = {
  id: string;
  disabled?: boolean;

  // Dropdown
  dropdownProps: SelectionDropdownProps;

  // Color picker
  showColorPicker?: boolean;
  colorPickerProps?: {
    color: ThreeColor;
    /** Alpha value, in the [0, 1] range. */
    alpha?: number;
    onChange: (color: ThreeColor, alpha: number) => void;
    presets?: PresetsItem[];
  };

  // Color ramp picker
  showColorRamp?: boolean;
  colorRampProps?: ColorRampSelectionProps;
};

const defaultProps: Partial<DropdownWithColorPickerProps> = {
  disabled: false,
  showColorPicker: true,
  showColorRamp: false,
};

const defaultColorRampProps: ColorRampSelectionProps = {
  selectedRamp: DEFAULT_COLOR_RAMP_KEY,
  colorRampsToDisplay: DISPLAY_COLOR_RAMP_KEYS,
  onChangeRamp: () => {},
};

const defaultColorPickerProps = {
  color: new ThreeColor("#ffffff"),
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
  const colorRampProps = { ...defaultColorRampProps, ...props.colorRampProps };
  const colorPickerProps = { ...defaultColorPickerProps, ...props.colorPickerProps };

  const colorPickerRef = useRef<HTMLParagraphElement>(null);

  const showAlpha = colorPickerProps.alpha !== undefined;
  let colorHexString = colorPickerProps.color.getHexString();
  if (showAlpha && colorPickerProps.alpha !== undefined) {
    colorHexString += Math.round(colorPickerProps.alpha * 255)
      .toString(16)
      .padStart(2, "0");
  }

  return (
    <HorizontalDiv ref={colorPickerRef}>
      <SelectionDropdown
        label={null}
        id={props.id}
        disabled={props.disabled}
        showSelectedItemTooltip={false}
        controlWidth="115px"
        {...props.dropdownProps}
      ></SelectionDropdown>
      <FlexRow style={{ position: "relative" }} $gap={6}>
        <div
          style={{
            // Normally, both ramp + color picker occupy the same position next
            // to the dropdown. If *both* are shown, place them in relative
            // position so they don't overlap.
            position: props.showColorPicker && props.showColorRamp ? "relative" : "absolute",
            visibility: props.showColorRamp ? "visible" : "hidden",
            opacity: props.showColorRamp ? "1" : "0",
            // Copied from Ant transition styles
            transition: "visibility 0s, opacity 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
          }}
        >
          <ColorRampDropdown
            id={props.id + "_ramp_picker"}
            disabled={props.disabled}
            {...colorRampProps}
          ></ColorRampDropdown>
        </div>
        <WrappedColorPicker
          id={props.id + "_color_picker"}
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
          presets={colorPickerProps.presets}
          // onChange returns a different color type, so must convert from hex
          onChange={(color, _cssColor) => {
            const hex = color.toHexString().slice(0, 7); // Remove alpha if present
            const alpha = color.toRgb().a;
            colorPickerProps.onChange?.(new ThreeColor(hex), alpha);
          }}
          disabled={props.disabled}
        />
      </FlexRow>
    </HorizontalDiv>
  );
}
