import { Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation } from "three";

import { useViewerStateStore } from "src/state/ViewerState";
import { FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { AntColor } from "src/utils/color_utils";

import WrappedColorPicker from "./Inputs/WrappedColorPicker";

type CategoricalColorPickerProps = {
  categories: string[];
  disabled?: boolean;
};

const defaultProps: Partial<CategoricalColorPickerProps> = {
  disabled: false,
};

const ColorPickerContainer = styled(FlexRow)<{
  $itemGap: string;
  $itemWidth: string;
  $maxItemsPerRow: string;
}>`
  gap: ${(props) => props.$itemGap};
  flex-wrap: wrap;
  margin-right: ${(props) => props.$itemGap};
  max-width: calc(
    ${(props) => `${props.$itemWidth} * ${props.$maxItemsPerRow} + ${props.$itemGap} * (${props.$maxItemsPerRow} - 1)`}
  );

  & > div {
    // Container for both the color picker and the text label.
    gap: 12px;
    width: ${(props) => props.$itemWidth};
    max-width: ${(props) => props.$itemWidth};
    height: fit-content;
  }

  & > div > label,
  & > div > label > span {
    // Text label, hide overflow as ellipsis
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export default function CategoricalColorPicker(inputProps: CategoricalColorPickerProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CategoricalColorPickerProps>;

  const categoricalPalette = useViewerStateStore((state) => state.categoricalPalette);
  const setCategoricalPalette = useViewerStateStore((state) => state.setCategoricalPalette);

  const colorPickers = useMemo(() => {
    const elements = [];
    for (let i = 0; i < props.categories.length; i++) {
      const color = categoricalPalette[i];
      const label = props.categories[i];
      const onChange = (_color: AntColor, hex: string): void => {
        const newPalette = [...categoricalPalette];
        newPalette[i] = new Color(hex as ColorRepresentation);
        setCategoricalPalette(newPalette);
      };
      const colorPickerId = `categorical-color-picker-${i}`;

      // Make the color picker component
      elements.push(
        <FlexRowAlignCenter key={i}>
          <WrappedColorPicker
            id={colorPickerId}
            value={color.getHexString()}
            onChange={onChange}
            size={"small"}
            disabledAlpha={true}
            // Necessary to prevent the color picker from going off the screen
            placement="right"
          />
          <Tooltip title={label} placement="top">
            <label htmlFor={colorPickerId}>
              <span>{label}</span>
            </label>
          </Tooltip>
        </FlexRowAlignCenter>
      );
    }
    return elements;
  }, [props]);

  return (
    <ColorPickerContainer $itemGap="8px" $maxItemsPerRow="6" $itemWidth="110px">
      {colorPickers}
    </ColorPickerContainer>
  );
}
