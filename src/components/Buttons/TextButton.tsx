import { Button, ButtonProps } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

import { FlexRowAlignCenter } from "../../styles/utils";

const StyledButton = styled(Button)`
  padding: 0 8px;
  &:not(:active) {
    border: 1px solid transparent;
    border-color: transparent !important;
  }
`;

/** Styled Ant button, which shows as plain text until hovered. */
export default function TextButton(props: PropsWithChildren<ButtonProps>): ReactElement {
  return (
    <StyledButton type="default" {...props}>
      <FlexRowAlignCenter $gap={2}>{props.children}</FlexRowAlignCenter>
    </StyledButton>
  );
}
