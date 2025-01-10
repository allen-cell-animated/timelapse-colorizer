import { Color as AntdColor } from "@rc-component/color-picker";
import { ColorPicker } from "antd";
import { PresetsItem } from "antd/es/color-picker/interface";
import React, { ReactElement, useRef } from "react";
import styled from "styled-components";
import { Color as ThreeColor,ColorRepresentation } from "three";

import { DrawMode } from "../../colorizer/types";
import { FlexRowAlignCenter } from "../../styles/utils";

import SelectionDropdown from "./SelectionDropdown";

type DrawModeSelectorProps = {
  selected: DrawMode;
  /** HTML ID that the selection dropdown is labelled by. */
  htmlLabelId: string;
  onChange: (mode: DrawMode, color: ThreeColor) => void;
  color: ThreeColor;
  disabled?: boolean;
};

const defaultProps: Partial<DrawModeSelectorProps> = {
  disabled: false,
};

const HorizontalDiv = styled(FlexRowAlignCenter)`
  gap: 6px;
  flex-direction: row;
  flex-wrap: wrap;
`;

const defaultPresetColors = [
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
const presets: PresetsItem[] = [
  {
    label: "Presets",
    colors: defaultPresetColors,
  },
];

const items = [
  { value: DrawMode.HIDE.toString(), label: "Hide" },
  { value: DrawMode.USE_COLOR.toString(), label: "Use custom color" },
];

/**
 * UI element for choosing between different drawing modes, and provides callbacks for when
 * changes are made to selections.
 * - `HIDE`: Hide an object type
 * - `USE_COLOR`: Use a custom, solid color. (When selected, also shows a ColorPicker.)
 */
export default function DrawModeSelector(propsInput: DrawModeSelectorProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<DrawModeSelectorProps>;

  const colorPickerRef = useRef<HTMLParagraphElement>(null);
  const showColorPicker = props.selected === DrawMode.USE_COLOR;

  return (
    <HorizontalDiv ref={colorPickerRef}>
      <SelectionDropdown
        label={null}
        htmlLabelId={props.htmlLabelId}
        selected={props.selected.toString()}
        items={items}
        showSelectedItemTooltip={false}
        onChange={(key: string) => {
          props.onChange(Number.parseInt(key, 10), props.color);
        }}
        disabled={props.disabled}
        width={"165px"}
      ></SelectionDropdown>

      <ColorPicker
        // Uses the default 1s transition animation
        style={{
          visibility: showColorPicker ? "visible" : "hidden",
          opacity: showColorPicker ? "1" : "0",
        }}
        size="small"
        disabledAlpha={true}
        defaultValue={new AntdColor(props.color.getHexString())}
        color={new AntdColor(props.color.getHexString())}
        presets={presets}
        // onChange returns a different color type, so must convert from hex
        onChange={(_color, hex) => props.onChange(props.selected, new ThreeColor(hex as ColorRepresentation))}
        disabled={props.disabled}
      />
    </HorizontalDiv>
  );
}
