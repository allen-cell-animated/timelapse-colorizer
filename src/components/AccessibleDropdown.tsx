import { Button, Dropdown, Tooltip } from "antd";
import { ItemType, MenuItemType } from "antd/es/menu/hooks/useItems";
import useToken from "antd/es/theme/useToken";
import React, { ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../assets";

const AntRecognizedButtonTypes = ["primary", "default", "dashed", "text", "link"];

const convertToAntButtonType = (type: string): "primary" | "default" | "dashed" | "text" | "link" => {
  if (AntRecognizedButtonTypes.includes(type)) {
    return type as "primary" | "default" | "dashed" | "text" | "link";
  }
  return "default";
};

type AccessibleDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  /** The key of the item that is currently selected. */
  selected: string;

  dropdownContents: ReactElement;
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: "primary" | "default" | "outlined" | "dashed" | "text" | "link";
  buttonText?: string;
  /** Optional override for the button. Can add a wrapper element or styling or completely replace the root dropdown object. */
  renderButton?: (button: ReactElement | null) => ReactElement;
  onButtonClicked: (key: string) => void;
  showTooltip?: boolean;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
  width?: string | null;
};

const defaultProps = {
  label: null,
  disabled: false,
  buttonType: "outlined",
  showTooltip: true,
  width: null,
  style: {},
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
const MainButton = styled(Button)<{ $open: boolean; type: AccessibleDropdownProps["buttonType"] }>`
  max-width: 164px;
  width: 15vw;
  min-width: 84px;
  // Override Antd width transition
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), width 0s;

  // Override Ant styling for the default (outlined) button style
  // so it fills in solid when hovered
  &.ant-btn-default:not(:disabled) {
    border-color: var(--color-borders);
    color: var(--color-text);
  }

  &.ant-btn-default:not(:disabled):hover {
    background-color: transparent;
    border-color: var(--color-button);
    color: var(--color-text); // Repeated to override color changes
  }

  &.ant-btn-default:not(:disabled):active {
    background-color: transparent;
    border-color: var(--color-button-active);
    color: var(--color-text);
  }

  // When the modal is opened ("pinned") by clicking on it, show an
  // extra active-style outline.
  ${(props) => {
    if (props.$open) {
      return css`
        :not(:disabled) {
          border-color: var(--color-button-active);
        }
        & .ant-btn-default:not(:disabled) {
          border-color: var(--color-button);
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

/** List of dropdown items */
const DropdownContent = styled.div`
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

/** A styled button inside the dropdown, which can be clicked to select an item. */
const DropdownItem = styled(Button)<{ $selected: boolean }>`
  text-align: left;
  padding: 3px 12px;
  border: 0px solid transparent;
  border-radius: 4px;
  overflow: hidden;

  & span {
    text-overflow: ellipsis;
    overflow: hidden;
    width: 100%;
  }

  ${(props) => {
    // Important tags needed here to prevent ant default button styling from overriding
    if (props.$selected) {
      // If selected, override hover and focus styles
      return css`
        background-color: var(--color-dropdown-selected) !important;
        color: var(--color-button) !important;
      `;
    }
    // Otherwise, add grey backdrop when hovered or focused
    return css`
      &:hover,
      &:focus {
        background-color: var(--color-dropdown-hover) !important;
      }
    `;
  }}
`;

/**
 * A wrapper around the Antd Dropdown with tooltips and a text label added.
 */
export default function AccessibleDropdown(inputProps: AccessibleDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<AccessibleDropdownProps>;

  // TODO: Consider refactoring this into a shared hook if this behavior is repeated again.
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

  // Set up the items for the dropdown menu
  const items = useMemo((): MenuItemType[] => {
    if (props.items.length === 0) {
      return [];
    }
    if (typeof props.items[0] === "string") {
      // Convert items into MenuItemType by missing properties
      return (props.items as string[]).map((name) => {
        return {
          label: name,
          key: name,
        };
      });
    } else {
      return props.items as MenuItemType[];
    }
  }, [props.items]);

  const selectedLabel = useMemo((): string => {
    for (const item of items) {
      if (item && item.key === props.selected) {
        return item.label?.toString() || "";
      }
    }
    return "";
  }, [props.selected, items]);

  const dropdownButton = (
    <MainButton
      disabled={props.disabled}
      style={props.width ? { width: props.width } : undefined}
      type={props.buttonType}
      $open={forceOpen}
      // Open the button when clicked for accessibility
      onClick={() => setForceOpen(!forceOpen)}
    >
      <MainButtonContents>
        <div>{selectedLabel}</div>
        <DropdownSVG />
      </MainButtonContents>
    </MainButton>
  );

  // Completely customize the dropdown menu and make the buttons manually.
  // This is because Antd's Dropdown component doesn't allow us to add item tooltips, and complicates
  // other behaviors (like tab navigation or setting width).
  // Ant recommends using the Popover component for this instead of Dropdown, but they use
  // different animation styling (Dropdown looks nicer).
  const dropdownList: ReactElement[] = items.map((item) => {
    return (
      <Tooltip key={item.key} title={item.label?.toString()} placement="right" trigger={["hover", "focus"]}>
        <DropdownItem
          key={item.key}
          type={"text"}
          $selected={item.key === props.selected}
          disabled={props.disabled}
          onClick={() => {
            props.onChange(item.key.toString());
          }}
        >
          {item.label}
        </DropdownItem>
      </Tooltip>
    );
  });

  const disableTooltip = props.disabled || !props.showTooltip;

  const [, token] = useToken();
  const dropdownStyle: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  if (props.width) {
    dropdownStyle.width = props.width;
  }

  return (
    <MainContainer ref={componentContainerRef} style={props.style}>
      {props.label && <h3>{props.label}</h3>}
      <Dropdown
        menu={{}}
        disabled={props.disabled}
        open={forceOpen || undefined}
        getPopupContainer={componentContainerRef.current ? () => componentContainerRef.current! : undefined}
        dropdownRender={(_menus: ReactNode) => {
          return (
            // Fake the menu background styling
            <DropdownContent style={dropdownStyle}>{dropdownList}</DropdownContent>
          );
        }}
      >
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={disableTooltip ? false : undefined}
          title={selectedLabel}
          placement="right"
          trigger={["hover", "focus"]}
        >
          {dropdownButton}
        </Tooltip>
      </Dropdown>
    </MainContainer>
  );
}
