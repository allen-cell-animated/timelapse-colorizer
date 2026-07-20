import styled from "styled-components";

export const TooltipCard = styled.div`
  font-family: var(--default-font);

  border-radius: var(--radius-control-small);
  border: 1px solid var(--color-dividers);
  background-color: var(--color-background);
  padding: 6px 8px;
  overflow-wrap: break-word;

  transition: opacity 300ms ease-in-out;
  width: fit-content;
`;
