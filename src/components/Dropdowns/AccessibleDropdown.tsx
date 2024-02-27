import { Button, Dropdown, Tooltip } from "antd";
import useToken from "antd/es/theme/useToken";
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";
import { VisuallyHidden } from "../../styles/utils";

type AccessibleDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;

  /** Contents to be rendered inside the dropdown. */
  dropdownContent: ReactElement;
  renderDropdownContent?: ((content: ReactElement) => ReactElement) | null;
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: "primary" | "default" | "outlined" | "dashed" | "text" | "link";
  buttonText: string;
  buttonStyle?: React.CSSProperties;
  /** Override for the button element. By default, renders the `props.buttonText` in a styled Antd button. */
  renderButton?: ((props: AccessibleDropdownProps) => ReactElement) | null;
  onButtonClicked?: (key: string) => void;
  showTooltip?: boolean;
  /** If null, uses button text. */
  tooltipText?: string | null;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
};

const defaultProps: Partial<AccessibleDropdownProps> = {
  label: null,
  renderDropdownContent: null,
  disabled: false,
  buttonType: "outlined",
  showTooltip: true,
  tooltipText: null,
  buttonStyle: {},
  renderButton: null,
  onButtonClicked: () => {},
};

/** Contains the main dropdown button and label text */
const MainContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: max-content;
  gap: 6px;
`;

/** Button that is clicked to open the dropdown */
const MainButton = styled(Button)<{ $open: boolean; $type: AccessibleDropdownProps["buttonType"] }>`
  width: 15vw;
  // Override Antd width transition
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), width 0s;

  // Override Ant styling for the outlined button style
  ${(props) => {
    if (props.$type === "outlined") {
      return css`
        &.ant-btn:not(:disabled) {
          border-color: var(--color-borders);
          color: var(--color-text);
        }

        &.ant-btn:not(:disabled):hover {
          background-color: transparent;
          border-color: var(--color-button);
          color: var(--color-text); // Repeated to override color changes
        }

        &.ant-btn:not(:disabled):active {
          background-color: transparent;
          border-color: var(--color-button-active);
          color: var(--color-text);
        }
      `;
    }
    return;
  }}

  // When the modal is opened ("pinned") by clicking on it, show an
  // extra active-style outline.
  ${(props) => {
    if (props.$open) {
      return css`
        &:not(:disabled) {
          border-color: var(--color-button-active) !important;
        }
      `;
    }
    return;
  }}
`;

/** Container for the text label and dropdown inside the main dropdown-triggering button. */
const MainButtonContents = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  // Button text label
  & div {
    width: 100%;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // Dropdown arrow
  & svg {
    width: 14px;
    height: 14px;
  }
`;

/** Wrapper around the dropdown content. */
const DropdownContentWrapper = styled.div`
  padding: 4px;
`;

/**
 * A keyboard-accessible wrapper around the Antd `Dropdown` component, with support for button styling, labels, and tooltips.
 */
export default function AccessibleDropdown(inputProps: AccessibleDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<AccessibleDropdownProps>;

  //// Handle clicking on the dropdowns ///////////////////////////////////

  // Support tab navigation by forcing the dropdown to stay open when clicked.
  const [forceOpen, setForceOpen] = useState(false);
  const componentContainerRef = useRef<HTMLDivElement>(null);

  // If open, close the dropdown when focus is lost.
  // Note that the focus out event will fire even if the newly focused element is also
  // inside the component, so we need to check if the new target is also a child element.
  useEffect(() => {
    if (!forceOpen) {
      return;
    }
    const doesContainTarget = (target: EventTarget | null): boolean => {
      return (
        (target instanceof Element &&
          componentContainerRef.current &&
          componentContainerRef.current.contains(target)) ||
        false
      );
    };
    const handleFocusLoss = (event: FocusEvent): void => {
      if (!doesContainTarget(event.relatedTarget)) {
        setForceOpen(false);
      }
    };

    componentContainerRef.current?.addEventListener("focusout", handleFocusLoss);
    return () => {
      componentContainerRef.current?.removeEventListener("focusout", handleFocusLoss);
    };
  }, [forceOpen]);

  //// Handle rendering of buttons and dropdown contents ///////////////////
  const defaultRenderButton = (props: AccessibleDropdownProps): ReactElement => {
    return (
      <MainButton
        disabled={props.disabled}
        style={props.buttonStyle}
        $type={props.buttonType}
        type={props.buttonType === "outlined" ? "default" : props.buttonType}
        $open={forceOpen}
        // Open the dropdown when clicked for accessibility
        onClick={() => setForceOpen(!forceOpen)}
      >
        <MainButtonContents>
          <div>
            {props.buttonText}
            <VisuallyHidden>(click to open menu)</VisuallyHidden>
          </div>
          <DropdownSVG />
        </MainButtonContents>
      </MainButton>
    );
  };
  const renderButton = props.renderButton || defaultRenderButton;

  // Use Ant styling for default dropdown content rendering
  const [, token] = useToken();
  const defaultRenderDropdownContent = (content: ReactElement): ReactElement => {
    // Fake the menu background styling
    const dropdownStyle: React.CSSProperties = {
      backgroundColor: token.colorBgElevated,
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadowSecondary,
    };

    return <DropdownContentWrapper style={dropdownStyle}>{content}</DropdownContentWrapper>;
  };
  const renderDropdownContent = props.renderDropdownContent || defaultRenderDropdownContent;

  const disableTooltip = props.disabled || !props.showTooltip;

  return (
    <MainContainer ref={componentContainerRef}>
      {props.label && <h3>{props.label}</h3>}
      <Dropdown
        menu={{}}
        disabled={props.disabled}
        open={forceOpen || undefined}
        getPopupContainer={componentContainerRef.current ? () => componentContainerRef.current! : undefined}
        dropdownRender={(_menus: ReactNode) => {
          return renderDropdownContent(props.dropdownContent);
        }}
      >
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={disableTooltip ? false : undefined}
          title={props.tooltipText !== null ? props.tooltipText : props.buttonText}
          placement="right"
          trigger={["hover", "focus"]}
        >
          {renderButton(props)}
        </Tooltip>
      </Dropdown>
    </MainContainer>
  );
}
