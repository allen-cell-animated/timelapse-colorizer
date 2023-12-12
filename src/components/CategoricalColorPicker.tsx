import React, { ReactElement } from "react";
import { Dataset } from "../colorizer";
import { ColorPicker } from "antd";
import { Color, ColorRepresentation } from "three";

import { Color as AntColor } from "antd/es/color-picker/color";
import styled from "styled-components";
import { FlexRow, FlexRowAlignCenter } from "../styles/utils";

type CategoricalColorPickerProps = {
  dataset: Dataset | null;
  featureName: string;
  selectedPalette: Color[];
  onChangePalette: (newPalette: Color[]) => void;
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
  const categories = props.dataset?.getFeatureCategories(props.featureName);
  if (!categories) {
    return <p>No valid data.</p>;
  }
  const numCategories = categories.length;

  const colorPickers = [];
  for (let i = 0; i < numCategories; i++) {
    const color = props.selectedPalette[i];
    const label = categories[i];
    const onChange = (_value: AntColor, hex: string): void => {
      const newPalette = [...props.selectedPalette];
      newPalette[i] = new Color(hex as ColorRepresentation);
      props.onChangePalette(newPalette);
    };

    // Make the color picker component
    colorPickers.push(
      <FlexRowAlignCenter key={i}>
        <ColorPicker value={color.getHexString()} onChange={onChange} size={"small"} disabledAlpha={true} />
        <span>{label}</span>
      </FlexRowAlignCenter>
    );
  }

  return (
    <ColorPickerContainer $itemGap="8px" $maxItemsPerRow="6" $itemWidth="110px">
      {colorPickers}
    </ColorPickerContainer>
  );
}
