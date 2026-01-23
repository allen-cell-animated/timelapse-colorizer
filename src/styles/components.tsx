import { Radio } from "antd";
import styled from "styled-components";

/**
 * Radio group with custom styling to keep button
 * hover and active states consistent with other buttons.
 */
export const StyledRadioGroup = styled(Radio.Group)`
  & .ant-radio-button-wrapper {
    &:not(:disabled):hover {
      color: var(--color-text-button);
      fill: var(--color-text-button);
      background-color: var(--color-button-hover);
      border-color: var(--color-button);
    }

    &:not(:disabled):active {
      border-color: var(--color-button-active);
    }
  }
`;

export const StyledHorizontalRule = styled.hr`
  width: 100%;
  height: 1px;
  background-color: var(--color-dividers);
  border: none;
`;

export const HotkeyText = styled.span`
  padding: 0px 4px;
  border-radius: 4px;
  background-color: var(--color-viewport-overlay-background);
  border: 1px solid var(--color-viewport-overlay-outline);
  min-width: 12px;
  text-align: center;
`;
