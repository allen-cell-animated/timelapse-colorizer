import React, { ReactElement, useState } from "react";
import styled from "styled-components";
import LabeledDropdown from "./LabeledDropdown";
import { DrawMode } from "../colorizer/ColorizeCanvas";
import { Color as ThreeColor, ColorRepresentation } from "three";
import { ColorPicker } from "antd";
import { Color as AntdColor } from "@rc-component/color-picker";

type DrawModeSelectorProps = {
  label: string;
  selected: DrawMode;
  onChange: (mode: DrawMode, color: ThreeColor) => void;
  color: ThreeColor;
};

const defaultProps: Partial<DrawModeSelectorProps> = {};

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

  const items = [
    { key: DrawMode.HIDE.toString(), label: "Hide values" },
    { key: DrawMode.USE_COLOR.toString(), label: "Use custom color" },
    { key: DrawMode.USE_RAMP.toString(), label: "Use color map" },
  ];

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
        {props.selected === DrawMode.USE_COLOR && (
          <ColorPicker
            size="small"
            disabledAlpha={true}
            defaultValue={new AntdColor(props.color.getHexString())}
            color={new AntdColor(props.color.getHexString())}
            // onChange returns a different color type, so must convert from hex
            // TODO: also call onChange here
            onChange={(_color, hex) => props.onChange(props.selected, new ThreeColor(hex as ColorRepresentation))}
          />
        )}
      </HorizontalDiv>
    </MainLayout>
  );
}
