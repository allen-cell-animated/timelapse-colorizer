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
