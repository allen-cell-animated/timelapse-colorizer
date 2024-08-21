import { ButtonProps, Tooltip } from "antd";
import React, { ReactElement, ReactNode } from "react";
import { components, DropdownIndicatorProps, OptionProps } from "react-select";

import { DropdownSVG } from "../../assets";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexRowAlignCenter } from "../../styles/utils";

import AntStyledSelect from "./AntStyledSelect";

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
    <FlexRowAlignCenter $gap={6}>
      {props.label && <h3>{props.label}</h3>}
      <Tooltip title={selectedOption?.tooltip || selectedOption?.label} trigger={["focus", "hover"]} placement="right">
        <AntStyledSelect
          classNamePrefix="react-select"
          placeholder=""
          type="outlined"
          value={selectedOption}
          components={{ Option }}
          options={options}
          isDisabled={props.disabled}
          isClearable={false}
          onChange={(value) => value && props.onChange((value as SelectItem).value)}
        />
      </Tooltip>
    </FlexRowAlignCenter>
  );
}
