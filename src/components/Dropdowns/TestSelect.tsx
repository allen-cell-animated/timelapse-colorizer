import { ButtonProps, Tooltip } from "antd";
import React, { ReactElement, ReactNode } from "react";
import Select, { components, DropdownIndicatorProps, StylesConfig } from "react-select";
import styled from "styled-components";

import { DropdownSVG } from "../../assets";
import { FlexRowAlignCenter } from "../../styles/utils";

type SelectItem = {
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
const SelectContainer = styled(FlexRowAlignCenter)``;

const customStyles: StylesConfig = {
  control: (base) => ({
    ...base,
    height: 28,
    minHeight: 28,
    width: "15vw",
    borderRadius: 6,
  }),
  valueContainer: (base) => ({
    ...base,
    height: 28,
    minHeight: 28,
    padding: "0 12px",
    margin: 0,
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
  // Fix z-ordering
  menu: (base) => ({
    ...base,
    zIndex: 100,
  }),
};

const DropdownIndicator = (props: DropdownIndicatorProps) => {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownSVG style={{ width: "14px", height: "14px" }} />
    </components.DropdownIndicator>
  );
};

export default function TestSelect(props: SelectionDropdownProps): ReactElement {
  const { items } = props;
  let options = items;

  // Get selected option
  const selectedOption = options.find((option) => option.value === props.selected);

  return (
    <Tooltip title={selectedOption?.tooltip || selectedOption?.label} trigger={["focus", "hover"]} placement="right">
      <SelectContainer $gap={6}>
        {props.label && <h3>{props.label}</h3>}
        <Select
          options={options}
          isDisabled={props.disabled}
          value={selectedOption}
          isClearable={false}
          placeholder=""
          components={{ DropdownIndicator }}
          classNamePrefix="react-select"
          onChange={(value) => value && props.onChange((value as SelectItem).value)}
          styles={customStyles}
        />
      </SelectContainer>
    </Tooltip>
  );
}
