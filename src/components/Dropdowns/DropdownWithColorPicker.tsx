import { Color as AntdColor } from "@rc-component/color-picker";
import { ColorPicker } from "antd";
import { PresetsItem } from "antd/es/color-picker/interface";
import React, { ReactElement, useRef } from "react";
import styled from "styled-components";
import { ColorRepresentation, Color as ThreeColor } from "three";

import { FlexRowAlignCenter } from "../../styles/utils";

import SelectionDropdown from "./SelectionDropdown";

const DEFAULT_PRESET_COLORS = [
  "#ffffff",
  "#f0f0f0",
  "#dddddd",
  "#c0c0c0",
  "#9d9d9d",
  "#808080",
  "#525252",
  "#393939",
  "#191919",
  "#000000",
];

type DrawModeSelectorProps = {
  selected: string;
  items: { value: string; label: string }[];
  /** HTML ID that the selection dropdown is labelled by. */
  htmlLabelId: string;
  onValueChange: (mode: string) => void;
  onColorChange: (color: ThreeColor) => void;
  color: ThreeColor;
  disabled?: boolean;
  showColorPicker?: boolean;
  presets?: string[];
};

const defaultProps: Partial<DrawModeSelectorProps> = {
  disabled: false,
  showColorPicker: true,
  presets: DEFAULT_PRESET_COLORS,
};

const HorizontalDiv = styled(FlexRowAlignCenter)`
  gap: 6px;
  flex-direction: row;
  flex-wrap: wrap;
`;

/**
 * Paired selection dropdown and color picker. Convenience component for
 * reusable layout.
 */
export default function DropdownWithColorPicker(propsInput: DrawModeSelectorProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<DrawModeSelectorProps>;

  const presets: PresetsItem[] = [
    {
      label: "Presets",
      colors: props.presets,
    },
  ];

  const colorPickerRef = useRef<HTMLParagraphElement>(null);

  return (
    <HorizontalDiv ref={colorPickerRef}>
      <SelectionDropdown
        label={null}
        htmlLabelId={props.htmlLabelId}
        selected={props.selected.toString()}
        items={props.items}
        showSelectedItemTooltip={false}
        onChange={(key: string) => {
          props.onValueChange(key);
        }}
        disabled={props.disabled}
        width={"165px"}
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
        presets={presets}
        // onChange returns a different color type, so must convert from hex
        onChange={(_color, hex) => props.onColorChange(new ThreeColor(hex as ColorRepresentation))}
        disabled={props.disabled}
      />
    </HorizontalDiv>
  );
}
