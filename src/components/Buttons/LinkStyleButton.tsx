import styled, { css } from "styled-components";

export const LinkStyleButton = styled.button<{
  $color?: string;
  $hoverColor?: string;
}>`
  margin: 0;
  padding: 0;
  width: auto;
  overflow: visible;
  background: transparent;
  line-height: normal;
  font: inherit;
  font-size: inherit;
  border: none;

  text-decoration: underline;

  ${(props) => {
    return css`
      color: ${props.$color || "var(--color-text-link)"};

      &:hover {
        color: ${props.$hoverColor || "var(--color-text-link-hover)"};
      }

      &:focus-visible {
        box-shadow: 0 0 0 3px ${props.$color || "var(--color-text-link)"};
      }
    `;
  }}
`;
