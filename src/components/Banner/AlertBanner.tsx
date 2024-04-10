import { Alert, AlertProps, Button, Checkbox } from "antd";
import React, { ReactElement, useState } from "react";
import styled, { css } from "styled-components";

import { Spread } from "../../colorizer/utils/type_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../styles/utils";

// Adjusts alignment of items within the Alert.
// Alerts are structured like this:
// icon | message | action (optional) | close button
const StyledAlert = styled(Alert)<{ type: "info" | "warning" | "error" | "success" }>`
  // Change item alignment to top of container, and apply a border color
  & {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 8px 30px;

    ${(props) => {
      return css`
        border-bottom: 1px solid var(--color-alert-${props.type}-border) !important;
      `;
    }}
  }

  // Align the icon with the top of the text
  & > .anticon {
    position: relative;
    top: 3px;
    font-size: 22px;

    & svg {
      // Prevent clipping of the icon
      overflow-x: visible;
      overflow-y: visible;
    }
  }

  // Force action to resize reasonably
  // and if it is a checkbox, align the checkbox and text with the top of the container/
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
  & > .ant-alert-close-icon:focus,
  & > .ant-alert-close-icon:focus-visible {
    outline: 4px solid #f2ebfa;
    outline-offset: 1px;
    transition: outline-offset 0s, outline 0s;
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
 * @param showDoNotShowAgainCheckbox: If true, will show a checkbox reading, "Do not show again for this dataset."
 * @param action: A button or other component element to show in the alert.
 *
 * Please consider using the `useAlertBanner` hook to manage alert banner states!
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

  const propsDescription = props.description;
  let description: ReactElement | undefined = undefined;
  if (Array.isArray(propsDescription) && propsDescription.length > 0) {
    description = (
      <>
        {propsDescription.map((text: string, index: number) => (
          <p key={index}>{text}</p>
        ))}
      </>
    );
  } else if (!Array.isArray(propsDescription) && propsDescription) {
    // Ignore empty text or undefined
    description = <p>{propsDescription}</p>;
  }

  const message = (
    <FlexColumn>
      <FlexRowAlignCenter $wrap={"wrap"} $gap={4}>
        <h3 style={{ margin: 0 }}>{props.message}</h3>
        {!showFullContent && (
          <Button
            type="link"
            style={{ padding: "0px", margin: "0 10px 0 0", border: 0, color: "var(--color-text-link)" }}
            onClick={() => setShowFullContent(true)}
          >
            <h3>Read More</h3>
          </Button>
        )}
      </FlexRowAlignCenter>
      {showFullContent && <FlexColumn>{description}</FlexColumn>}
    </FlexColumn>
  );

  newProps.message = message;

  // Override the "message" prop on the Alert with a custom react element
  return <StyledAlert {...newProps}></StyledAlert>;
}
