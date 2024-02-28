import { Button } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

import { FlexRowAlignCenter } from "../../styles/utils";

type TextButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
};
const defaultProps: Partial<TextButtonProps> = {
  onClick: () => {},
  disabled: false,
};

const StyledButton = styled(Button)`
  padding: 0 8px;
  &:not(:active) {
    border: 1px solid transparent;
    border-color: transparent !important;
  }
`;

/** Styled Ant button, which shows as plain text until hovered. */
export default function TextButton(inputProps: PropsWithChildren<TextButtonProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<TextButtonProps>>;
  return (
    <StyledButton type="default" onClick={props.onClick} disabled={props.disabled}>
      <FlexRowAlignCenter $gap={2}>{props.children}</FlexRowAlignCenter>
    </StyledButton>
  );
}
