import { Button, ButtonProps, Dropdown, theme, Tooltip } from "antd";
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";
import { VisuallyHidden } from "../../styles/utils";

/**
 * A function that returns the contents to be rendered inside the dropdown.
 *
 * @param setOpenState: A callback that can be used to force the dropdown open or closed.
 * Useful for closing the dropdown after a selection has been made.
 */
type GetDropdownContentFunction = (setOpenState: (open: boolean) => void) => ReactElement;

const enum OpenState {
  FORCE_OPEN,
  FORCE_CLOSED,
  DEFAULT,
}

type AccessibleDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;

  /**
   * Contents to be rendered inside the dropdown. Can either be a React element or a function
   * that returns a React element.
   */
  dropdownContent: ReactElement | GetDropdownContentFunction;
  /** Styles the `dropdownContent` to match other Antd styling. Can be overridden to change how content is displayed or rendered. */
  styleDropdownContent?: ((dropdownContent: ReactElement) => ReactElement) | null;
  disabled?: boolean;
  /**
   * The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic
   */
  buttonType?: ButtonProps["type"] | "outlined";
  buttonText: string;
  buttonStyle?: React.CSSProperties;
  /**
   * Override for the button element. By default, renders `props.buttonText` in a styled Antd button.
   *
   * @param props: The props passed to the dropdown component.
   * @param isOpen: Whether the dropdown is currently open.
   * @param onClick: The callback to open the dropdown.
   *
   * Overrides must call the provided `onClick` callback during click or interaction events for the
   * dropdown to work correctly.
   *
   * Tooltips may not work as expected if the root element is not a button or does not take callbacks
   *  as props for the following events: `onMouseEnter/Leave`, `onPointerEnter/Leave`,
   * `onFocus`, or `onBlur`. See implementation of `IconButton.tsx` for an example.
   */
  renderButton?: ((props: AccessibleDropdownProps, isOpen: boolean, onClick: () => void) => ReactElement) | null;
  onButtonClicked?: () => void;
  /** Whether the tooltip should appear when hovered. */
  showTooltip?: boolean;
  /** If null, uses button text. */
  tooltipText?: string | null;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
};

const defaultProps: Partial<AccessibleDropdownProps> = {
  label: null,
  styleDropdownContent: null,
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
        // Extra classnames to increase selector specificity; otherwise gets overridden by root styling
        &.ant-btn.ant-btn-default:not(:disabled) {
          border-color: var(--color-borders);
          color: var(--color-text);
        }

        &.ant-btn.ant-btn-default:not(:disabled):hover {
          background-color: transparent;
          border-color: var(--color-button);
          color: var(--color-text); // Repeated to override color changes
        }

        &.ant-btn.ant-btn-default:not(:disabled):active {
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

/** Container for the text label and dropdown arrow SVG inside the main dropdown-triggering button. */
const MainButtonContents = styled.div`
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

  /**
   * Whether the dropdown's visibility is forced open, forced closed, or in the default state.
   */
  const [forceOpenState, setForceOpenState] = useState<OpenState>(OpenState.DEFAULT);
  const componentContainerRef = useRef<HTMLDivElement>(null);

  // If open, close the dropdown when focus is lost.
  // Note that the focus out event will fire even if the newly focused element is also
  // inside the component, so we need to check if the new target is also a child element.
  useEffect(() => {
    if (forceOpenState === OpenState.DEFAULT) {
      return;
    } else if (forceOpenState === OpenState.FORCE_CLOSED) {
      // If the dropdown was forced closed, reset the open state to the default so it can be interacted with
      // again.
      setForceOpenState(OpenState.DEFAULT);
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
        setForceOpenState(OpenState.DEFAULT);
      }
    };

    componentContainerRef.current?.addEventListener("focusout", handleFocusLoss);
    return () => {
      componentContainerRef.current?.removeEventListener("focusout", handleFocusLoss);
    };
  }, [forceOpenState]);

  //// Handle rendering of buttons and dropdown contents ///////////////////
  const defaultRenderButton = (props: AccessibleDropdownProps, isOpen: boolean, onClick: () => void): ReactElement => {
    return (
      <MainButton
        disabled={props.disabled}
        style={props.buttonStyle}
        $type={props.buttonType}
        type={props.buttonType === "outlined" ? "default" : props.buttonType}
        $open={isOpen}
        // Open the dropdown when clicked for accessibility
        onClick={onClick}
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
  const { token } = theme.useToken();
  const defaultRenderDropdownContent = (content: ReactElement): ReactElement => {
    // Fake the menu background styling
    const dropdownStyle: React.CSSProperties = {
      backgroundColor: token.colorBgElevated,
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadowSecondary,
    };
    return <DropdownContentWrapper style={dropdownStyle}>{content}</DropdownContentWrapper>;
  };
  const renderDropdownContent = props.styleDropdownContent || defaultRenderDropdownContent;

  let dropdownContent: ReactElement;
  if (typeof props.dropdownContent === "function") {
    const setOpenState = (open: boolean): void => {
      setForceOpenState(open ? OpenState.FORCE_OPEN : OpenState.FORCE_CLOSED);
    };
    dropdownContent = props.dropdownContent(setOpenState);
  } else {
    dropdownContent = props.dropdownContent;
  }

  const disableTooltip = props.disabled || !props.showTooltip;
  const isOpen = forceOpenState === OpenState.FORCE_OPEN;
  const onButtonClick = (): void => {
    props.onButtonClicked();
    // Toggle
    setForceOpenState(forceOpenState === OpenState.FORCE_OPEN ? OpenState.FORCE_CLOSED : OpenState.FORCE_OPEN);
  };

  let dropdownOpenProp = undefined;
  if (forceOpenState === OpenState.FORCE_OPEN) {
    dropdownOpenProp = true;
  } else if (forceOpenState === OpenState.FORCE_CLOSED) {
    dropdownOpenProp = false;
  }

  return (
    <MainContainer ref={componentContainerRef}>
      {props.label && <h3>{props.label}</h3>}
      <Dropdown
        disabled={props.disabled}
        open={dropdownOpenProp}
        getPopupContainer={componentContainerRef.current ? () => componentContainerRef.current! : undefined}
        dropdownRender={(_menus: ReactNode) => {
          return renderDropdownContent(dropdownContent);
        }}
      >
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={disableTooltip ? false : undefined}
          title={props.tooltipText !== null ? props.tooltipText : props.buttonText}
          placement="right"
          trigger={["hover", "focus"]}
        >
          {renderButton(props, isOpen, onButtonClick)}
        </Tooltip>
      </Dropdown>
    </MainContainer>
  );
}
