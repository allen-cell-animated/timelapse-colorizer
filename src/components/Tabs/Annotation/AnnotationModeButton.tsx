import { CheckOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React, { ReactElement, useContext } from "react";
import styled, { css } from "styled-components";

import { TagIconSVG } from "../../../assets";
import { FlexRow, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";

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
            <TagIconSVG /> Apply and edit annotations
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
