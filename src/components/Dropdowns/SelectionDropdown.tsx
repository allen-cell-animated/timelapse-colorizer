import { ButtonProps, Tooltip } from "antd";
import Fuse from "fuse.js";
import React, { ReactElement, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { components, ControlProps, OptionProps } from "react-select";

import { useDebounce } from "../../hooks/useDebounce";
import { FlexRowAlignCenter } from "../../styles/utils";
import { SelectItem } from "./types";

import StyledSelect from "./StyledSelect";

// TODO: Have the dropdown show a loading indicator after a selection has been made
// but before the prop value updates. -> this is especially noticeable when slow datasets.
// Is there a way we can do this using async promises, maybe? If the promise rejects,
// discard the changed value?

type SelectionDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  id?: string;
  /** The value of the item that is currently selected. */
  selected: string | SelectItem | undefined;
  /** An array of SelectItems that describes the item properties (`{value,
   * label}`), or an array of strings. Dropdown items will be presented in the
   * provided array order.
   *
   * If a string array is provided, SelectItems objects will be auto-generated
   * with `value` and `label` values set to the string.
   *
   * NOTE: Items should be memoized to prevent unnecessary re-renders. Without
   * memoization, react-select will re-render dropdown options based on the
   * `items` property on every render, which can cause unexpected or unwanted
   * behavior such as flickering on hover during rapid page updates.
   */
  items: SelectItem[] | string[];
  controlTooltipPlacement?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
  isSearchable?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: ButtonProps["type"] | "outlined";
  /** Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `value` of the selected item. */
  onChange: (value: string) => void;
  /** * If true, shows the label of the currently-selected item as a tooltip
   * when hovering over the input/selection area. */
  showSelectedItemTooltip?: boolean;
  /**
   * Total width of the dropdown button and the label. Overrides the default
   * sizing behavior if set.
   */
  width?: string;
  controlWidth?: string;
  menuWidth?: string;
  containerStyle?: React.CSSProperties;
  controlStyle?: React.CSSProperties;
};

const defaultProps: Partial<SelectionDropdownProps> = {
  buttonType: "outlined",
  showSelectedItemTooltip: true,
  controlTooltipPlacement: "top",
};

// Override options in the menu list to include tooltips and, optionally, image content.
const Option = (props: OptionProps<SelectItem>): ReactElement => {
  // Debounce the tooltip so it only shows after a short delay when focusing/hovering over it.
  const isFocused = useDebounce(props.isFocused, 100) && props.isFocused;
  const title = (props as OptionProps<SelectItem>).data.tooltip;

  const copiedProps = { ...props, data: { ...(props.data as SelectItem) } };

  if ((props.data as SelectItem).image) {
    copiedProps.children = (
      <img src={copiedProps.data.image} alt={copiedProps.data.label} style={{ width: "118px", height: "100%" }}></img>
    );
  }

  return (
    <Tooltip
      title={(copiedProps as OptionProps<SelectItem>).data.tooltip}
      trigger={["hover", "focus"]}
      placement="right"
      open={title !== undefined && isFocused ? true : undefined}
      mouseEnterDelay={0.5}
      mouseLeaveDelay={0}
    >
      <div>
        <components.Option {...copiedProps} />
      </div>
    </Tooltip>
  );
};

/** Converts an array of strings or SelectItems to an array of SelectItems. */
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
 * A Select component that supports web accessibility guidelines for keyboard
 * controls. Options can be searched by typing in the dropdown input.
 *
 * Uses react-select internally but mimics the style of Ant Design for
 * consistency.
 *
 * NOTE: The `items` prop should be memoized to prevent unnecessary re-renders.
 * Without memoization, react-select will re-render dropdown options based on
 * the `items` property on every render, which can cause unexpected or unwanted
 * behavior such as flickering on hover during rapid page updates.
 */
export default function SelectionDropdown(inputProps: React.PropsWithChildren<SelectionDropdownProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const options = useMemo(() => formatAsSelectItems(props.items), [props.items]);

  // TODO: Show loading spinner?
  const [_isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState("");
  const [filteredValues, setFilteredValues] = useState<Set<string>>(new Set(options.map((item) => item.value)));

  let selectedOption: SelectItem | undefined;
  if (typeof props.selected === "string") {
    // Find the full options object corresponding with the selected object
    selectedOption = options.find((option) => option.value === props.selected);
  } else {
    selectedOption = props.selected;
  }

  useEffect(() => {
    if (!props.label && !props.id) {
      console.warn(
        "SelectionDropdown: No label or id provided for the dropdown, which means that the select component may not be labeled correctly for screen readers." +
          " Consider either providing the `label` prop, or setting the `id` prop and passing it an HTML `label` via the `for` attribute."
      );
    }
  }, []);

  // Set up fuse for fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(options, {
      keys: ["value", "label"],
      isCaseSensitive: false,
      shouldSort: true, // sorts by match score
    });
  }, [props.items]);

  // Filter the items based on the search input
  useMemo(() => {
    if (searchInput === "") {
      startTransition(() => {
        // Reset to original list
        setFilteredValues(new Set(options.map((item) => item.value)));
      });
    } else {
      const searchResult = fuse.search(searchInput);
      const filteredItems = searchResult.map((result) => result.item.value);
      startTransition(() => {
        setFilteredValues(new Set(filteredItems));
      });
    }
  }, [searchInput, props.items]);

  // Add tooltip so it only responds to interaction with the selected option in the control area.
  // Fixes a bug where the tooltip would show when hovering anywhere over the dropdown, including
  // other options.
  const Control = useCallback(
    (controlProps: ControlProps<SelectItem>): ReactElement => {
      const selectedOption = controlProps.getValue()[0] as SelectItem | undefined;

      return (
        <Tooltip
          title={selectedOption?.label}
          trigger={["hover", "focus"]}
          placement={props.controlTooltipPlacement}
          open={props.showSelectedItemTooltip ? undefined : false}
        >
          <div>
            <components.Control {...controlProps}>
              {selectedOption?.image && (
                <img
                  src={selectedOption.image}
                  alt={selectedOption.label}
                  style={{ width: "100%", height: "100%", position: "absolute", pointerEvents: "none" }}
                ></img>
              )}
              {controlProps.children}
            </components.Control>
          </div>
        </Tooltip>
      );
    },
    [props.showSelectedItemTooltip, props.controlTooltipPlacement]
  );

  // Create an ID for the HTML label element if one is provided.
  const selectId = props.id ?? "selection-dropdown-" + props.label?.toLowerCase().replaceAll(" ", "_");
  const labelId = props.label ? selectId + "-label" : undefined;

  return (
    <FlexRowAlignCenter $gap={6} style={{ width: props.width, minWidth: props.width }}>
      {props.label && (
        <label htmlFor={selectId} style={{ whiteSpace: "nowrap" }}>
          <h3 id={labelId}>{props.label}</h3>
        </label>
      )}
      <StyledSelect
        aria-labelledby={labelId}
        inputId={selectId}
        classNamePrefix="react-select"
        isMulti={false}
        placeholder=""
        type={props.buttonType ?? "outlined"}
        value={selectedOption}
        components={{ Option, Control }}
        options={options}
        filterOption={(option) => filteredValues.has(option.value)}
        isDisabled={props.disabled}
        isClearable={false}
        isSearchable={props.isSearchable}
        // TODO: Allow `onChange` to be async, and show a loading indicator
        // + the awaited value while waiting for it to resolve.
        onChange={(value) => {
          if (value && value.value) {
            props.onChange(value.value);
          }
          startTransition(() => {
            setSearchInput("");
          });
        }}
        onInputChange={(input) => {
          startTransition(() => {
            setSearchInput(input);
          });
        }}
        controlWidth={props.controlWidth}
        menuWidth={props.menuWidth}
      />
      {props.children}
    </FlexRowAlignCenter>
  );
}
