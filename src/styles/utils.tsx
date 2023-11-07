import styled, { css } from "styled-components";

/**
 * Blocks inputs inside this container from having visible spinner handles.
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
 * Equivalent to:
 * ```
 * <div style={{display: "flex", flexDirection: "column", gap: `${$gap}px`}}>
 * ```
 */
export const FlexColumn = styled(FlexDiv)`
  flex-direction: column;
`;

/**
 * Equivalent to:
 * ```
 * <div style={{display: "flex", flexDirection: "row", gap: `${$gap}px`}}>
 * ```
 */
export const FlexRow = styled(FlexDiv)`
  flex-direction: row;
`;

/**
 * Equivalent to:
 * ```
 * <div style={{display: "flex", flexDirection: "row", alignItems: "center",
 *          gap: `${$gap}px`
 *      }}
 * >
 * ```
 */
export const FlexRowCentered = styled(FlexRow)`
  align-items: center;
`;
