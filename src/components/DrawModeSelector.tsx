import React, { ReactElement, useRef } from "react";
import styled from "styled-components";
import LabeledDropdown from "./LabeledDropdown";
import { DrawMode } from "../colorizer/ColorizeCanvas";
import { Color as ThreeColor, ColorRepresentation } from "three";
import { Collapse, CollapseProps, ColorPicker } from "antd";
import { Color as AntdColor } from "@rc-component/color-picker";
import { ColorRampData } from "../constants";

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

const MiniCollapse = styled(Collapse)`
  line-height: 1.666667;
  font-size: 12px;

  // Style the collapse menu so it looks like Color Picker's default
  & .ant-collapse-item .ant-collapse-header {
    margin: 0;
    padding: 0;
  }

  & .ant-collapse-item .ant-collapse-header .ant-collapse-expand-icon {
    height: 20px;
    color: rgba(0, 0, 0, 0.25);
    padding-inline-end: 4px;
    margin-inline-start: 4px;
  }
`;

const HorizontalDiv = styled(MainLayout)`
  flex-direction: row;
  flex-wrap: wrap;
`;

export default function DrawModeSelector(propsInput: DrawModeSelectorProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<DrawModeSelectorProps>;

  const colorMapHeaderRef = useRef<HTMLParagraphElement>(null);

  const items = [
    { key: DrawMode.HIDE.toString(), label: "Hide values" },
    { key: DrawMode.USE_COLOR.toString(), label: "Use custom color" },
    { key: DrawMode.USE_RAMP.toString(), label: "Use color map" },
  ];

  const presetColors = [
    {
      label: "Presets",
      colors: [
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
      ],
    },
    {
      label: (
        <p style={{ fontSize: "12px", margin: "0" }} ref={colorMapHeaderRef}>
          Some text
        </p>
      ),
      colors: [
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
      ],
    },
  ];

  const showColorPicker = props.selected === DrawMode.USE_COLOR;

  const collapseItems: CollapseProps["items"] = [{ key: "1", label: "Use Color Ramp", children: <p>Some Text</p> }];

  return (
    <MainLayout style={{ margin: "5px 0" }}>
      <h3>{props.label}</h3>
      <HorizontalDiv>
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
          presets={presetColors}
          // onChange returns a different color type, so must convert from hex
          onChange={(_color, hex) => props.onChange(props.selected, new ThreeColor(hex as ColorRepresentation))}
          panelRender={(panel, extra) => {
            return (
              <>
                {panel}
                <MiniCollapse items={collapseItems} ghost size="small" />
              </>
            );
          }}
        />
      </HorizontalDiv>
    </MainLayout>
  );
}
