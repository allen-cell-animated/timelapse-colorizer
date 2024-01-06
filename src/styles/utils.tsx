import styled, { css } from "styled-components";

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

const FlexDiv = styled.div<{ $gap?: number }>`
  display: flex;
  ${(props) => {
    // Gap between items is parameterized
    if (props.$gap) {
      return css`
        gap: ${props.$gap}px;
      `;
    }
    return;
  }}
`;

/**
 * A flexbox container that lays out children in a column.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexColumn = styled(FlexDiv)`
  flex-direction: column;
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
 * A grid container that aligns settings by labels and input.
 *
 * A settings object should be a `label` containing ONLY two child elements;
 * a `span` text element first, and any other element second.
 *
 * If no `$spanWidth` is provided, the `span` label will be up to 30% of the container width.
 *
 * @param spanWidth CSS string used to set the width of the label's `span` column. Defaults to `"fit-content(30%)"`.
 * If you do not want the `span` column to be sized automatically, set this to a fixed width or percentage (ex: `"30%"` or `"100px"`).
 * @param gapPx The gap, in pixels, between each row and column. 6 by default.
 * @param indentPx The indent, in pixels, of the entire container. 10 by default.
 *
 * @example
 * ```
 * <SettingsContainer>
 *   <label>
 *     <span>Label for a setting</span>
 *     <input type="text" />  // can be any SINGLE element (including divs). Multiple elements will break the layout.
 *   </label>
 * </SettingsContainer>
 * ```
 */
export const SettingsContainer = styled.div<{ $spanWidth?: string; $gapPx?: number; $indentPx?: number }>`
  display: grid;

  ${(props) => {
    const spanWidth = props.$spanWidth ? props.$spanWidth : "fit-content(30%)";
    const gap = props.$gapPx ? props.$gapPx : 6;
    const indent = props.$indentPx ? props.$indentPx : 10;

    return css`
      grid-template-columns: ${spanWidth} auto;
      gap: ${gap}px;
      padding-left: ${indent}px;
    `;
  }}

  & > label {
    grid-column: 1 / 3; // Labels span both columns
    display: grid;
    grid-template-columns: subgrid;
    ${(props) => {
      // Apply same gap between elements as between rows
      return css`
        gap: ${props.$gapPx ? props.$gapPx : 6}px;
      `;
    }}
  }

  & > label > span:first-of-type {
    display: grid;
    grid-column: 1;
    align-items: center;
    text-align: right;
  }

  & > label > :not(span:first-of-type) {
    grid-column: 2;
    // Lines up the bottom of the input with the bottom of the label,
    // where the colon separator is.
    align-items: end;
  }
`;
