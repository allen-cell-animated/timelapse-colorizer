import { Color as AntdColor } from "@rc-component/color-picker";
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
  onColorChange: (color: ThreeColor) => void;
  color: ThreeColor;
  disabled?: boolean;
  showColorPicker?: boolean;
  presets?: PresetsItem[];
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
        disabledAlpha={true}
        defaultValue={new AntdColor(props.color.getHexString())}
        color={new AntdColor(props.color.getHexString())}
        presets={props.presets}
        // onChange returns a different color type, so must convert from hex
        onChange={(_color, hex) => props.onColorChange(new ThreeColor(hex as ColorRepresentation))}
        disabled={props.disabled}
      />
    </HorizontalDiv>
  );
}
