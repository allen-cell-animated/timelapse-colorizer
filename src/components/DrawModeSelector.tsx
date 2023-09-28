import React, { ReactElement, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import LabeledDropdown from "./LabeledDropdown";
import { DrawMode } from "../colorizer/ColorizeCanvas";
import { Color as ThreeColor, ColorRepresentation } from "three";
import { Collapse, CollapseProps, ColorPicker } from "antd";
import { Color as AntdColor } from "@rc-component/color-picker";
import { ColorRampData } from "../constants";
import { PresetsItem } from "antd/es/color-picker/interface";

const PRESET_COLORS_WIDTH = 10;

type DrawModeSelectorProps = {
  label: string;
  selected: DrawMode;
  onChange: (mode: DrawMode, color: ThreeColor) => void;
  color: ThreeColor;
  colorMap?: ColorRampData | null;
};

const defaultProps: Partial<DrawModeSelectorProps> = {
  colorMap: null,
};

const MainLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HorizontalDiv = styled(MainLayout)`
  flex-direction: row;
  flex-wrap: wrap;
`;

export default function DrawModeSelector(propsInput: DrawModeSelectorProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<DrawModeSelectorProps>;

  const colorPickerRef = useRef<HTMLParagraphElement>(null);
  const colorMapHeaderRef = useRef<HTMLParagraphElement>(null);
  const [selectedColorMapIndex, setSelectedColorMapIndex] = useState(-1);

  const items = [
    { key: DrawMode.HIDE.toString(), label: "Hide values" },
    { key: DrawMode.USE_COLOR.toString(), label: "Use custom color" },
    { key: DrawMode.USE_RAMP.toString(), label: "Use color map" },
  ];

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

  // Optionally add on color map presets
  if (props.colorMap) {
    // Sample color map to generate presets list
    const colorMapColors: string[] = Array.apply(null, Array(PRESET_COLORS_WIDTH)).map(function (_value, index) {
      return props.colorMap!.colorRamp.sample(index / (PRESET_COLORS_WIDTH - 1)).getHexString();
    });

    presets.push({
      label: (
        <p style={{ fontSize: "12px", margin: "0" }} ref={colorMapHeaderRef}>
          Use Color Map
        </p>
      ),
      colors: colorMapColors,
    });
  }

  // Bind listener events to each of the "Use Color Map" buttons, since Antd doesn't give us a way to distinguish when a button preset is clicked.
  // Buckle up, this is going to be a wild one.
  useEffect(() => {
    if (!colorMapHeaderRef) {
      return;
    }
    // Use ref to the label to get the
    // p > div.ant-color-picker-presets-label > span.ant-collapse-header-text > div.ant-collapse-header > div.ant-collapse-item
    const parentCollapseItem = colorMapHeaderRef.current?.parentElement?.parentElement?.parentElement?.parentElement;
    // div.ant-collapse-content
    const collapseContent = parentCollapseItem?.children[1];
    // div.ant-collapse-content > ant-collapse-content-box > ant-color-picker-presets-items
    const itemContainer = collapseContent?.children[0].children[0];

    // All the clickable buttons are divs inside of the itemContainer. Bind click event listeners
    // so we can retrieve
    if (!itemContainer?.children) {
      console.log("sad");
      return;
    }
    for (let i = 0; i < itemContainer.children.length; i++) {
      const divButton = itemContainer.children.item(i) as HTMLDivElement;
      divButton.addEventListener("click", () => {
        setSelectedColorMapIndex(i);
        console.log(i);
      });
    }
  }, []);

  // Bind click handlers for all the inputs that change the currently selected color.
  useEffect(() => {
    if (colorPickerRef.current) {
      const palette = colorPickerRef.current.querySelectorAll(".ant-color-picker-palette")[0];
      console.log(colorPickerRef.current.querySelectorAll(".ant-color-picker-palette"));
      const slider = colorPickerRef.current.querySelectorAll(".ant-color-picker-slider")[0];
      const presets = colorPickerRef.current.querySelectorAll(".ant-color-picker-color-block");

      // Reset the color map selector if the palette, slider, or non-color map presets are used to change colors.
      palette?.addEventListener("click", () => {
        setSelectedColorMapIndex(-1);
        console.log("palette");
      });
      slider?.addEventListener("click", () => {
        setSelectedColorMapIndex(-1);
        console.log("slider");
      });
    }
  }, []);

  const showColorPicker = props.selected === DrawMode.USE_COLOR;

  const collapseItems: CollapseProps["items"] = [{ key: "1", label: "Use Color Ramp", children: <p>Some Text</p> }];

  return (
    <MainLayout style={{ margin: "5px 0" }}>
      <h3>{props.label}</h3>
      <HorizontalDiv ref={colorPickerRef}>
        <LabeledDropdown
          label={null}
          selected={props.selected.toString()}
          items={items}
          showTooltip={false}
          onChange={(key: string) => {
            props.onChange(Number.parseInt(key), props.color);
          }}
        ></LabeledDropdown>

        <ColorPicker
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
        />
      </HorizontalDiv>
    </MainLayout>
  );
}
