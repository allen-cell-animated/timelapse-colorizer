import { Link } from "react-router-dom";
import styled, { css } from "styled-components";

/**
 * `Link` component styled to look like an Ant primary button, while maintaining
 * the semantics/behavior of links.
 */
export const ButtonStyleLink = styled(Link)<{ type: "primary" | "outlined" | undefined }>`
  display: inline-block;
  width: fit-content;
  padding: 2px 15px;

  background-color: var(--color-button);
  color: var(--color-text-button);
  border-radius: 6px;
  border: 1px solid var(--color-button);
  text-decoration: none !important;

  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), box-shadow 0s linear;

  &:hover {
    background-color: var(--color-button-hover);
    border: 1px solid var(--color-button-hover);
    color: var(--color-text-button);
  }

  &:active {
    border: 1px solid var(--color-button);
  }

  &:focus-visible {
    text-decoration: underline !important;
  }

  ${(props) => {
    if (props.type === "outlined") {
      return css`
        background-color: transparent;
        color: var(--color-button);
        border: 1px solid var(--color-button);

        &:hover {
          border: 1px solid var(--color-button);
        }

        &:active {
          border: 1px solid var(--color-button-active);
        }
      `;
    } else {
      return css``;
    }
  }}
`;
