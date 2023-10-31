import React, { ReactElement } from "react";
import styled from "styled-components";

type ScaleBarProps = {
  style?: React.CSSProperties;
  units?: string;
  canvasPixelsToUnits: number;
  canvasWidth?: number;
  // Get by multiplying canvas to frame scale, frame width in pixels, and conversion factor from frame pixels to units
};
const defaultProps: Partial<ScaleBarProps> = {
  style: {},
  units: "um",
  canvasPixelsToUnits: 1,
  canvasWidth: 730,
};

const ScaleBarContainer = styled.div`
  position: relative;
`;

const ScaleBarLine = styled.div`
  padding: 0 5px;
  // Draw the line using a gradient with hard stops
  border-width: 1px;
  border-style: solid;
  border-image-slice: 1;
  border-image-source: linear-gradient(
    to top,
    var(--color-text-primary),
    var(--color-text-primary) 50%,
    transparent 50%,
    transparent
  );
`;

const ScaleBarLabel = styled.div`
  width: 100%;
  text-align: right;
`;

export default function ScaleBar(inputProps: ScaleBarProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScaleBarProps>;

  // Determine a good size to show the scale bar at!
  const minWidthPx = 80;
  let scaleBarWidthInUnits = 0;

  const decimalPlaces = Math.ceil(Math.log10(props.canvasPixelsToUnits)) + 1;
  console.log(decimalPlaces);

  const minWidthUnits = minWidthPx * props.canvasPixelsToUnits;
  const unitsToNearestTen = Math.ceil(minWidthUnits / 10 ** decimalPlaces) * 10 ** decimalPlaces;

  scaleBarWidthInUnits = unitsToNearestTen;

  // But we might have to handle cases where units can only be shown as decimals

  // TODO: Handle canvasPixelsToUnits = 0

  return (
    <ScaleBarContainer style={{ ...props.style, width: scaleBarWidthInUnits / props.canvasPixelsToUnits }}>
      <ScaleBarLine>
        <ScaleBarLabel>
          {scaleBarWidthInUnits}
          {props.units}
        </ScaleBarLabel>
      </ScaleBarLine>
    </ScaleBarContainer>
  );
}
