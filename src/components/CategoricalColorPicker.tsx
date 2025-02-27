import { ColorPicker, Tooltip } from "antd";
import { Color as AntColor } from "antd/es/color-picker/color";
import React, { ReactElement, useMemo } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation } from "three";
import { useShallow } from "zustand/shallow";

import { FlexRow, FlexRowAlignCenter } from "../styles/utils";

import { useViewerStateStore } from "../state/ViewerState";

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
  margin-top: 8px;
  margin-bottom: 8px;
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

  & > div > span {
    // Text label, hide overflow as ellipsis
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export default function CategoricalColorPicker(inputProps: CategoricalColorPickerProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CategoricalColorPickerProps>;
  const store = useViewerStateStore(
    useShallow((state) => ({
      categoricalPalette: state.categoricalPalette,
      setCategoricalPalette: state.setCategoricalPalette,
    }))
  );

  const colorPickers = useMemo(() => {
    const elements = [];
    for (let i = 0; i < props.categories.length; i++) {
      const color = store.categoricalPalette[i];
      const label = props.categories[i];
      const onChange = (_value: AntColor, hex: string): void => {
        const newPalette = [...store.categoricalPalette];
        newPalette[i] = new Color(hex as ColorRepresentation);
        store.setCategoricalPalette(newPalette);
      };

      // Make the color picker component
      elements.push(
        <FlexRowAlignCenter key={i}>
          <ColorPicker value={color.getHexString()} onChange={onChange} size={"small"} disabledAlpha={true} />
          <Tooltip title={label} placement="top">
            <span>{label}</span>
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
