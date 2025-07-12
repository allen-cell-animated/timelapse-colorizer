import { ColorPicker } from "antd";
import { PresetsItem } from "antd/es/color-picker/interface";
import React, { ReactElement, useRef } from "react";
import styled from "styled-components";
import { ColorRepresentation, Color as ThreeColor } from "three";

import { FlexRowAlignCenter } from "../../styles/utils";

import SelectionDropdown from "./SelectionDropdown";

type DropdownWithColorPickerProps = {
  selected: string;
  items: { value: string; label: string }[];
  /** HTML ID that the selection dropdown is labelled by. */
  htmlLabelId: string;
  onValueChange: (mode: string) => void;
  color: ThreeColor;
  disabled?: boolean;
  showColorPicker?: boolean;
  presets?: PresetsItem[];
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
        htmlLabelId={props.htmlLabelId}
        selected={props.selected.toString()}
        items={props.items}
        showSelectedItemTooltip={false}
        onChange={props.onValueChange}
        disabled={props.disabled}
        width={"105px"}
      ></SelectionDropdown>
      <ColorPicker
        // Uses the default 1s transition animation
        style={{
          visibility: props.showColorPicker ? "visible" : "hidden",
          opacity: props.showColorPicker ? "1" : "0",
        }}
        size="small"
        disabledAlpha={!showAlpha}
        defaultValue={colorHexString}
        value={colorHexString}
        presets={props.presets}
        // onChange returns a different color type, so must convert from hex
        onChange={(color, hex) =>
          props.onColorChange(new ThreeColor(hex.slice(0, 7) as ColorRepresentation), color.toRgb().a)
        }
        disabled={props.disabled}
      />
    </HorizontalDiv>
  );
}
