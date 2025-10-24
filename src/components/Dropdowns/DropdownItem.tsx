import { Button } from "antd";
import React, { type PropsWithChildren, type ReactElement } from "react";
import styled, { css } from "styled-components";

type DropdownItemProps = {
  /** The key of the item. */
  key: React.Key;
  /** Whether the item is currently selected. False by default. */
  selected?: boolean;
  disabled?: boolean;
  onClick: (key: React.Key) => void;
  onFocus?: () => void;
};

const defaultProps: Partial<DropdownItemProps> = {
  selected: false,
  disabled: false,
};

/** A styled button inside the dropdown, which can be clicked to select an item. */
const DropdownItemButton = styled(Button)<{ $selected: boolean }>`
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

/** Styled Antd Button for use with Dropdown inputs. */
export default function DropdownItem(inputProps: PropsWithChildren<DropdownItemProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<DropdownItemProps>>;
  return (
    <DropdownItemButton
      $selected={props.selected}
      key={props.key}
      type="text"
      onClick={() => props.onClick(props.key)}
      onFocus={props.onFocus}
    >
      {props.children}
    </DropdownItemButton>
  );
}
