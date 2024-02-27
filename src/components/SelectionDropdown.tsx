import { Button, Tooltip } from "antd";
import { ItemType, MenuItemType } from "antd/es/menu/hooks/useItems";
import React, { ReactElement, useMemo } from "react";
import styled, { css } from "styled-components";

import AccessibleDropdown from "./AccessibleDropdown";

type SelectionDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  /** The key of the item that is currently selected. */
  selected: string;
  /** An array of ItemType that describes the item properties (`{key, label}`),
   * or an array of strings. Dropdown items will be presented in the provided array order.
   *
   * If a string array is provided, ItemType objects will be
   * auto-generated with `key` and `label` values set to the string.*/
  items: ItemType[] | string[];
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: "primary" | "default" | "outlined" | "dashed" | "text" | "link";
  /** Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `key` of the selected item. */
  onChange: (key: string) => void;
  showTooltip?: boolean;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
  width?: string | null;
  style?: React.CSSProperties;
};

const defaultProps = {
  label: null,
  disabled: false,
  buttonType: "outlined",
  showTooltip: true,
  width: null,
  style: {},
};

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

const DropdownItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

/**
 * An wrapper around an AccessibleDropdown that allows for the selection of a single item at a time.
 * @param inputProps
 * @returns
 */
export default function SelectionDropdown(inputProps: SelectionDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SelectionDropdownProps>;

  // Convert items into MenuItemType, adding missing properties as needed
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

  // Get the label of the selected item
  const selectedLabel = useMemo((): string => {
    for (const item of items) {
      if (item && item.key === props.selected) {
        return item.label?.toString() || "";
      }
    }
    return "";
  }, [props.selected, items]);

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

  const dropdownContent = <DropdownItemList>{dropdownList}</DropdownItemList>;

  return (
    <AccessibleDropdown
      label={props.label}
      disabled={props.disabled}
      width={props.width}
      buttonType={props.buttonType}
      buttonText={selectedLabel}
      showTooltip={props.showTooltip}
      dropdownContent={dropdownContent}
    ></AccessibleDropdown>
  );
}
