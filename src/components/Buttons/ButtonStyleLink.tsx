import { Link } from "react-router-dom";
import styled from "styled-components";

/**
 * `Link` component styled to look like an Ant primary button, while maintaining
 * the semantics/behavior of links.
 */
export const ButtonStyleLink = styled(Link)`
  display: inline-block;
  width: fit-content;
  padding: 2px 15px;

  background-color: var(--color-button);
  color: var(--color-text-button);
  border-radius: 6px;
  border: 1px solid var(--color-button);
  text-decoration: none !important;

  transition: box-shadow 0 none, 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

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
`;
