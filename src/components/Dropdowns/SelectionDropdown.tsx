import { ButtonProps, Tooltip } from "antd";
import React, { ReactElement, ReactNode, useCallback, useEffect, useState } from "react";
import { components, ControlProps, OptionProps } from "react-select";

import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexRowAlignCenter } from "../../styles/utils";

import StyledSelect from "./StyledSelect";

export type SelectItem = {
  value: string;
  label: string;
  /**
   * Optional tooltip for an option. If set, a tooltip will be shown when
   * the option is hovered or focused in the dropdown.
   */
  tooltip?: string | ReactNode;
};

type SelectionDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  /**
   * ID of the HTML element used to label this dropdown, to be used with `aria-labelledby`.
   * Ignored if `label` is provided.
   */
  htmlLabelId?: string;
  /** The value of the item that is currently selected. */
  selected: string;
  /**
   * An array of SelectItems that describes the item properties (`{value, label}`),
   * or an array of strings. Dropdown items will be presented in the provided array order.
   *
   * If a string array is provided, SelectItems objects will be
   * auto-generated with `value` and `label` values set to the string.*/
  items: SelectItem[] | string[];
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: ButtonProps["type"] | "outlined";
  /**
   * Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `value` of the selected item.
   */
  onChange: (value: string) => void;
  /**
   * If true, shows the label of the currently-selected item as a tooltip
   * when hovering over the input/selection area.
   */
  showSelectedItemTooltip?: boolean;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
  width?: string | null;
};

const defaultProps: Partial<SelectionDropdownProps> = {
  showSelectedItemTooltip: true,
};

// Override options in the menu list to include tooltips.
// Because the full text is shown in the dropdown, tooltips will only be shown
// when they are provided as an argument.
const Option = (props: OptionProps): ReactElement => {
  const isFocused = useDebounce(props.isFocused, 100) && props.isFocused;
  const title = (props as OptionProps<SelectItem>).data.tooltip;
  return (
    <Tooltip
      title={(props as OptionProps<SelectItem>).data.tooltip}
      trigger={["hover", "focus"]}
      placement="right"
      open={title !== undefined && isFocused ? true : undefined}
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
 * Converts an array of strings or SelectItems to an array of SelectItems.
 */
function formatAsSelectItems(items: string[] | SelectItem[]): SelectItem[] {
  if (items.length === 0) {
    return [];
  }
  if (typeof items[0] === "string") {
    return (items as string[]).map((item) => ({ value: item, label: item }));
  }

  return items as SelectItem[];
}

/**
 * A Select component that supports web accessibility guidelines for keyboard controls.
 * Options can be searched by typing in the dropdown input.
 *
 * Uses react-select internally but mimics the style of Ant Design for consistency.
 */
export default function TestSelect(inputProps: SelectionDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [searchInput, setSearchInput] = useState("");
  const options = formatAsSelectItems(props.items);

  // Get selected option and make a copy.
  const selectedOption = options.find((option) => option.value === props.selected);

  useEffect(() => {
    if (!props.label && !props.htmlLabelId) {
      console.warn(
        "SelectionDropdown: Please provide a string 'label' or the HTML ID of the label ('htmlLabelId') to support screen readers."
      );
    }
  }, []);

  // Add tooltip so it only responds to interaction with the selected option in the control area.
  // Fixes a bug where the tooltip would show when hovering anywhere over the dropdown, including
  // other options.
  const Control = useCallback(
    (controlProps: ControlProps): ReactElement => {
      const selectedOption = controlProps.getValue()[0] as OptionProps<SelectItem> | undefined;

      return (
        <Tooltip
          title={selectedOption?.label}
          trigger={["hover", "focus"]}
          placement="right"
          open={props.showSelectedItemTooltip ? undefined : false}
        >
          <div>
            <components.Control {...controlProps} />
          </div>
        </Tooltip>
      );
    },
    [props.showSelectedItemTooltip]
  );

  // Create an ID for the HTML label element if one is provided.
  const id = props.label ? `dropdown-label-${props.label.toLowerCase()}` : undefined;

  return (
    <FlexRowAlignCenter $gap={6}>
      {props.label && <h3 id={id ?? props.htmlLabelId}>{props.label}</h3>}
      <StyledSelect
        aria-labelledby={id}
        classNamePrefix="react-select"
        placeholder=""
        type={props.buttonType ?? "outlined"}
        value={selectedOption}
        components={{ Option, Control }}
        options={options}
        isDisabled={props.disabled}
        isClearable={false}
        onChange={(value) => {
          if (value && (value as SelectItem).value) {
            props.onChange((value as SelectItem).value);
          }
        }}
        onInputChange={setSearchInput}
        width={props.width ?? undefined}
      />
    </FlexRowAlignCenter>
  );
}
