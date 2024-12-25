import { Alert, AlertProps, Button, Checkbox } from "antd";
import React, { ReactElement, useState } from "react";
import styled, { css } from "styled-components";

import { Spread } from "../../colorizer/utils/type_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../styles/utils";
import { renderStringArrayAsJsx } from "../../utils/formatting";

// Adjusts alignment of items within the Alert.
// Alerts are structured like this:
// icon | message | action (optional) | close button
const StyledAlert = styled(Alert)<{ type: "info" | "warning" | "error" | "success" }>`
  // Change item alignment to top of container, and apply a border color

  align-items: flex-start;
  flex-wrap: wrap;
  padding: 8px 30px;

  ${(props) => {
    return css`
      border-bottom: 1px solid var(--color-alert-${props.type}-border) !important;
    `;
  }}

  // Align the icon with the top of the text
  & > .anticon {
    position: relative;
    top: 3px;
    font-size: 22px;

    svg {
      // Prevent clipping of the icon
      overflow: visible;
    }
  }

  // Force action to resize reasonably
  // and if it is a checkbox, align the checkbox and text with the top of the container
  & > .ant-alert-action {
    max-width: 30vw;

    & .ant-checkbox-wrapper {
      margin-left: 10px;
      margin-top: 3px;

      & span {
        align-self: flex-start;
      }

      & .ant-checkbox {
        margin-top: 3px;
      }
    }
  }

  // Add outline to close button when focused
  & > .ant-alert-close-icon {
    // Align with rest of content/actions
    margin-top: 7px;

    &:focus,
    &:focus-visible {
      outline: 4px solid #f2ebfa;
      outline-offset: 1px;
      transition: outline-offset 0s, outline 0s;
    }
  }
`;

const ReadMoreButton = styled(Button)`
  padding: 0px;
  margin: 0 10px 0 0;
  border: 0;
  color: var(--color-text-link);

  &:hover {
    color: var(--color-text-link-hover);
  }

  &:focus {
    text-decoration: underline;
  }
`;

export type AlertBannerProps = Spread<
  Omit<AlertProps, "onClose" | "afterClose" | "message" | "description" | "banner"> & {
    message: string;
    /** Additional text, hidden behind a button labeled "Read more". Use an array for multiple lines.*/
    description?: string | string[];
    /** If true, will show a checkbox reading, "Do not show again for this dataset." */
    showDoNotShowAgainCheckbox?: boolean;
    onClose?: (doNotShowAgain: boolean) => void;
    afterClose?: (doNotShowAgain: boolean) => void;
  }
>;

/**
 * A banner-style alert that wraps around the Ant Alert component.
 * @param type: Type of alert to show. Can be "info", "warning" (default), "error", or "success".
 * @param message: The main message to display in the alert.
 * @param description: The description to display in the alert. This will be hidden behind a "Read more" button until clicked.
 * @param showDoNotShowAgainCheckbox: If true, will show a checkbox reading, "Do not show again for this dataset." for the alert's action.
 * @param action: A button or other component element to show in the alert. Overridden if `showDoNotShowAgainCheckbox` is true.
 *
 * Use this component directly to display static messages that should appear on startup.
 * If dynamically adding or removing banners, use the `useAlertBanner` hook to manage alert banner states.
 */
export default function AlertBanner(props: AlertBannerProps): ReactElement {
  const [isDoNotShowAgainChecked, setIsDoNotShowAgainChecked] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  const onClose = (): void => {
    props.onClose?.(isDoNotShowAgainChecked);
  };
  const afterClose = (): void => {
    props.afterClose?.(isDoNotShowAgainChecked);
  };

  const newProps: AlertProps = { ...props, onClose, afterClose };
  newProps.banner = true;
  newProps.description = undefined;

  // Override action if set to use the "Do not show again" checkbox
  if (props.showDoNotShowAgainCheckbox) {
    newProps.action = (
      <Checkbox checked={isDoNotShowAgainChecked} onChange={() => setIsDoNotShowAgainChecked(!isDoNotShowAgainChecked)}>
        Do not show again for this dataset
      </Checkbox>
    );
    newProps.closable = true;
  }

  const description = renderStringArrayAsJsx(props.description);
  const message = (
    <FlexColumn>
      <FlexRowAlignCenter $wrap={"wrap"} $gap={4}>
        <h3 style={{ margin: 0 }}>{props.message}</h3>
        {!showFullContent && (
          <ReadMoreButton type="link" onClick={() => setShowFullContent(true)}>
            <h3>Read More</h3>
          </ReadMoreButton>
        )}
      </FlexRowAlignCenter>
      {showFullContent && <FlexColumn>{description}</FlexColumn>}
    </FlexColumn>
  );

  // Override the "message" prop on the Alert with a custom react element
  newProps.message = message;

  return <StyledAlert {...newProps}></StyledAlert>;
}
