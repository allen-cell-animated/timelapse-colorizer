import styled from "styled-components";

/**
 * Blocks `input` elements inside this container from having visible spinner handles.
 */
export const NoSpinnerContainer = styled.div`
  /* Chrome, Safari, Edge, Opera */
  & input::-webkit-outer-spin-button,
  & input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  & input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
`;

const FlexDiv = styled.div<{ $gap?: number; $wrap?: React.CSSProperties["flexWrap"] }>`
  display: flex;
  gap: ${(props) => props.$gap || 0}px;
  flex-wrap: ${(props) => props.$wrap || "nowrap"};
`;

/**
 * A flexbox container that lays out children in a column.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexColumn = styled(FlexDiv)`
  flex-direction: column;
`;

/**
 * A flexbox container that lays out children in a column, and aligns all items
 * to the horizontal center.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexColumnAlignCenter = styled(FlexColumn)`
  align-items: center;
`;

/**
 * A flexbox container that lays out children in a row.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexRow = styled(FlexDiv)`
  flex-direction: row;
`;

/**
 * A flexbox container that lays out children in a row, and aligns all items
 * to the vertical center.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexRowAlignCenter = styled(FlexRow)`
  align-items: center;
`;

/**
 * Text that is visually hidden, but still accessible to screen readers.
 * Based on https://tailwindcss.com/docs/screen-readers
 */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;
