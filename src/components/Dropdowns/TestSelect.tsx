import { ButtonProps, Tooltip } from "antd";
import React, { ReactElement, ReactNode } from "react";
import Select, { components, DropdownIndicatorProps, OptionProps, StylesConfig } from "react-select";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexRowAlignCenter } from "../../styles/utils";

export type SelectItem = {
  value: string;
  label: string;
  tooltip?: string | ReactNode;
};

type SelectionDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  /** The key of the item that is currently selected. */
  selected: string;
  /** An array of SelectItems that describes the item properties (`{key, label}`),
   * or an array of strings. Dropdown items will be presented in the provided array order.
   *
   * If a string array is provided, SelectItems objects will be
   * auto-generated with `key` and `label` values set to the string.*/
  items: SelectItem[];
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: ButtonProps["type"] | "outlined";
  /** Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `key` of the selected item. */
  onChange: (value: string) => void;
  showTooltip?: boolean;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
  width?: string | null;
  /**
   * Whether the search bar should be enabled. If enabled, will show search bar and filter
   * by search input when the total number of items is above `searchThresholdCount`. True by default.
   */
  enableSearch?: boolean;
  /** The number of items that must be in the original list before the search bar will be shown. 10 by default.*/
  searchThresholdCount?: number;
};

// React select offers a few strategies for styling the dropdown. I've elected to use
// styled-components and the classnames that react-select provides to make it consistent
// with the rest of the app.
const SelectContainer = styled(FlexRowAlignCenter)<{ $type: SelectionDropdownProps["buttonType"] }>`
  & .react-select__control {
    box-shadow: none;

    ${(props) => {
      // TODO: Can I compose this shared Ant styling? It's repeated in IconButton.tsx
      switch (props.$type) {
        case "outlined":
          return css`
            border: 1px solid var(--color-borders);
            background-color: transparent;

            &:disabled {
              border: 1px solid var(--color-borders);
              background-color: var(--color-button-disabled);
              color: var(--color-text-disabled);
              fill: var(--color-text-disabled);
            }

            &:hover {
              border: 1px solid var(--color-button);
            }
          `;

        case "primary":
        default:
          return css`
            fill: var(--color-text-button);

            &:disabled {
              fill: var(--color-text-disabled);
            }
          `;
      }
    }}

    // Note: Focus ring is visible even when not using keyboard navigation.
    // This is because browsers show the focus ring whenever an input is focused,
    // and there is no way to differentiate between navigation methods.
    &:focus-within:has(input:focus-visible) {
      // Focus ring
      box-shadow: none;
      outline: 4px solid #efe9f7 !important ;
      outline-offset: 1px;
      transition: outline-offset 0s, outline 0s;
    }

    &.react-select__control--menu-is-open {
      border: 1px solid var(--color-button-outline-active);
    }
  }
`;

const customStyles: StylesConfig = {
  control: (base, { isFocused }) => ({
    ...base,
    height: 28,
    minHeight: 28,
    width: "15vw",
    borderRadius: 6,
    borderColor: isFocused ? "var(--color-button-outline-active)" : "var(--color-borders)",
  }),
  valueContainer: (base) => ({
    ...base,
    height: 28,
    minHeight: 28,
    padding: "0 0 0 12px",
    margin: 0,
    // Adjust feature up slightly to center text
    top: "-2px",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: 26,
    color: undefined,
  }),
  // Hide vertical separator bar and use default font color for the dropdown indicator
  dropdownIndicator: (styles) => ({
    ...styles,
    color: undefined,
  }),
  clearIndicator: (styles) => ({
    ...styles,
    color: undefined,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (base) => ({
    ...base,
    // use standard z-index for Ant popups
    zIndex: 1050,
    width: "max-content",
    minWidth: base.width,
    maxWidth: "calc(min(50vw, 500px))",
    // Outline is caused by the shadow! Check w/ Lyndsay on whether we prefer the outline,
    // if not uncomment the below:
    // boxShadow:
    //   "rgba(0, 0, 0, 0.08) 0px 6px 16px 0px, rgba(0, 0, 0, 0.12) 0px 3px 6px -4px, rgba(0, 0, 0, 0.05) 0px 9px 28px 8px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  option: (styles, { isFocused, isSelected, isDisabled }) => ({
    ...styles,
    // Style to match Ant dropdowns
    borderRadius: 4,
    color: isSelected ? "var(--color-dropdown-text-selected)" : "black",
    backgroundColor: isDisabled
      ? undefined
      : isSelected
      ? "var(--color-dropdown-selected)"
      : isFocused
      ? "var(--color-dropdown-hover)"
      : "white",
    // Don't change background color on click.
    ":active": {
      backgroundColor: !isDisabled
        ? isSelected
          ? "var(--color-dropdown-selected)"
          : "var(--color-dropdown-hover)"
        : undefined,
    },

    // Pad to match Ant dropdowns. Default padding is "8px 12px" so adjust size to account
    // for 4px extra padding on every side.
    padding: "4px 8px",
    margin: 4,
    width: `calc(${styles.width} - 8px)`,
  }),
};

// Replace existing dropdown with custom dropdown arrow
const DropdownIndicator = (props: DropdownIndicatorProps) => {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownSVG style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" />
    </components.DropdownIndicator>
  );
};

// TODO: replace menu list with self-shadowing div

// Override options in the menu list to include tooltips
const Option = (props: OptionProps) => {
  const isFocused = useDebounce(props.isFocused, 100) && props.isFocused;
  return (
    <Tooltip
      title={(props as OptionProps<SelectItem>).data.tooltip ?? props.label ?? "AAAAAAAAAAAAA"}
      trigger={["hover", "focus"]}
      placement="right"
      open={isFocused ? true : undefined}
      mouseEnterDelay={0.5}
      mouseLeaveDelay={0}
    >
      <div>
        <components.Option {...props} />
      </div>
    </Tooltip>
  );
};

/**
 * A Select component that supports web accessibility guidelines for keyboard controls.
 * Options can be searched by typing in the dropdown input.
 *
 * Uses react-select internally but mimics the style of Ant Design for consistency.
 */
export default function TestSelect(props: SelectionDropdownProps): ReactElement {
  const { items } = props;
  let options = items;

  // Get selected option
  const selectedOption = options.find((option) => option.value === props.selected);

  // TODO: Move tooltip to only be around the dropdown box (and not the whole element)
  // TODO: blur on selection?
  return (
    <Tooltip title={selectedOption?.tooltip || selectedOption?.label} trigger={["focus", "hover"]} placement="right">
      <SelectContainer $gap={6} $type={"outlined"}>
        {props.label && <h3>{props.label}</h3>}
        <Select
          classNamePrefix="react-select"
          placeholder=""
          value={selectedOption}
          components={{ DropdownIndicator, Option }}
          options={options}
          isDisabled={props.disabled}
          isClearable={false}
          onChange={(value) => value && props.onChange((value as SelectItem).value)}
          styles={customStyles}
        />
      </SelectContainer>
    </Tooltip>
  );
}
