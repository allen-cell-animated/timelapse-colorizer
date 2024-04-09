import { Alert, AlertProps, Button, Checkbox } from "antd";
import React, { ReactElement, useState } from "react";
import styled from "styled-components";

import { Spread } from "../../colorizer/utils/type_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../styles/utils";

// Adjusts alignment of items within the Alert
const StyledAlert = styled(Alert)`
  & {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  & > .ant-alert-action {
    max-width: 30vw;

    // Align checkbox with the top of the text, and align
    // items so they meet the top edge of the container
    & .ant-checkbox-wrapper {
      margin-left: 10px;

      & span {
        align-self: flex-start;
      }

      & .ant-checkbox {
        margin-top: 3px;
      }
    }
  }

  // Align the icon with the top of the text
  & > .anticon {
    position: relative;
    top: 4px;

    & svg {
      overflow-x: visible;
      overflow-y: visible;
    }
  }

  // Add focus outline to close
  & > .ant-alert-close-icon:focus,
  & > .ant-alert-close-icon:focus-visible {
    outline: 4px solid #f2ebfa;
    outline-offset: 1px;
    transition: outline-offset 0s, outline 0s;
  }
`;

export type AlertBannerProps = Spread<
  Omit<AlertProps, "onClose" | "afterClose" | "message" | "description" | "closable" | "banner"> & {
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

  const onClose = () => {
    props.onClose?.(isDoNotShowAgainChecked);
  };
  const afterClose = () => {
    props.afterClose?.(isDoNotShowAgainChecked);
  };

  const newProps: AlertProps = { ...props, onClose, afterClose };
  newProps.banner = true;
  newProps.description = undefined;
  newProps.closable = true;

  // Override action if showDoNotShowAgainCheckbox is true
  if (props.showDoNotShowAgainCheckbox) {
    newProps.action = (
      <Checkbox checked={isDoNotShowAgainChecked} onChange={() => setIsDoNotShowAgainChecked(!isDoNotShowAgainChecked)}>
        Do not show again for this dataset
      </Checkbox>
    );
  }

  const propsDescription = props.description;
  const description = Array.isArray(propsDescription) ? (
    <>
      {propsDescription.map((text: string, index: number) => (
        <p key={index}>{text}</p>
      ))}
    </>
  ) : (
    <p>{props.description}</p>
  );

  const message = (
    <FlexColumn>
      <FlexRowAlignCenter $wrap={"wrap"} $gap={4}>
        <p style={{ margin: 0 }}>{props.message}</p>
        {!showFullContent && (
          <Button
            type="link"
            style={{ padding: "0px", height: "22px", color: "var(--color-text-link)" }}
            onClick={() => setShowFullContent(true)}
          >
            Read More
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
