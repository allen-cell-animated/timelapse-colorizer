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

  const minWidthPx = 80;

  const minWidthUnits = minWidthPx * props.canvasPixelsToUnits;
  // Here we get the power of the most significant digit (MSD) of the minimum width in units.
  const msdPower = Math.ceil(Math.log10(minWidthUnits));

  // Get the nearest value in the place of the MSD that is greater than the minimum width.
  // This means that the displayed unit in the scale bar only changes at its MSD.
  // 0.1, 0.2, 0.3, ...
  // 1, 2, 3, ...
  // 10, 20, 30, ...
  const scaleBarWidthInUnits = Math.ceil(minWidthUnits / 10 ** (msdPower - 1)) * 10 ** (msdPower - 1);

  return (
    <ScaleBarContainer style={{ ...props.style, width: scaleBarWidthInUnits / props.canvasPixelsToUnits }}>
      <ScaleBarLine>
        <ScaleBarLabel>
          {/** Fixes float error for unrepresentable values (0.3 => 0.30000000000004) */}
          {scaleBarWidthInUnits < 1 ? scaleBarWidthInUnits.toPrecision(1) : scaleBarWidthInUnits.toFixed(0)}
          {props.units}
        </ScaleBarLabel>
      </ScaleBarLine>
    </ScaleBarContainer>
  );
}
