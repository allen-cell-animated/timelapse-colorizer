import { CheckOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React, { type ReactElement, useContext } from "react";
import styled, { css } from "styled-components";

import { TagIconSVG } from "src/assets";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRow, FlexRowAlignCenter } from "src/styles/utils";

/**
 * Overrides the default button color with a green 'success' color
 * when the button is active.
 */
const AnnotationModeStyledButton = styled(Button)<{ $active: boolean }>`
  ${(props) => {
    if (props.$active) {
      return css`
        background-color: var(--color-button-success-bg);
        border: 1px solid var(--color-button-success-bg);

        &&&&:hover {
          border: 1px solid var(--color-button-success-hover);
          background-color: var(--color-button-success-hover);
        }

        &&&&:active {
          background-color: var(--color-button-success-hover);
          border: 1px solid var(--color-button-success-bg);
        }
      `;
    }
    return;
  }}
`;

type AnnotationModeButtonProps = {
  active: boolean;
  onClick: () => void;
  hasAnnotations: boolean;
};

export default function AnnotationModeButton(props: AnnotationModeButtonProps): ReactElement {
  const theme = useContext(AppThemeContext);

  return (
    <FlexRow style={{ width: "100%" }} $gap={6}>
      <AnnotationModeStyledButton
        type="primary"
        $active={props.active}
        style={{ paddingLeft: "10px" }}
        onClick={props.onClick}
      >
        {props.active ? (
          <FlexRowAlignCenter $gap={6}>
            <CheckOutlined /> Done
          </FlexRowAlignCenter>
        ) : (
          <FlexRowAlignCenter $gap={6}>
            <TagIconSVG />
            {props.hasAnnotations ? "Edit" : "Create"} annotations
          </FlexRowAlignCenter>
        )}
      </AnnotationModeStyledButton>
      {props.active && (
        <p style={{ color: theme.color.text.hint }}>
          <i>Editing in progress; click objects to apply annotations</i>
        </p>
      )}
    </FlexRow>
  );
}
