import React, { ReactElement, useMemo } from "react";
import styles from "./LabeledDropdown.module.css";
import { Dropdown, Tooltip, Button, MenuProps } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import DropdownSVG from "../assets/dropdown-arrow.svg?react";

type LabeledDropdownProps = {
  /** Text label to include with the dropdown. */
  label: string;
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
  buttonType?: "primary" | "default" | "dashed" | "text" | "link";
  /** Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `key` of the selected item. */
  onChange: (key: string) => void;
};

/**
 * A wrapper around the Antd Dropdown with tooltips and a text label added.
 */
export default function LabeledDropdown(props: LabeledDropdownProps): ReactElement {
  const items = useMemo((): ItemType[] => {
    if (props.items.length === 0) {
      return [];
    }
    if (typeof props.items[0] === "string") {
      // Convert items into ItemType by missing properties
      return (props.items as string[]).map((name) => {
        return {
          label: name,
          key: name,
        };
      });
    } else {
      return props.items as ItemType[];
    }
  }, [props.items]);

  const datasetMenuProps: MenuProps = {
    onClick: (e) => {
      props.onChange(e.key);
    },
    items: items,
    selectable: true,
    selectedKeys: [props.selected],
    // TODO: Override render property for menu to add text clipping + tooltips for long entries
  };

  let dropdownContents = (
    <Button disabled={props.disabled} type={props.buttonType} rootClassName={styles.button}>
      <div className={styles.buttonContents}>
        <div className={styles.buttonText}>{props.selected}</div>
        <DropdownSVG className={`${styles.buttonIcon} ${styles[props.buttonType || "default"]}`} />
      </div>
    </Button>
  );

  // Add a tooltip for the currently selected element.
  // Workaround: Remove the tooltip when the dropdown is disabled, as otherwise it introduces a placeholder span
  // element that messes with the height of the button when disabled.
  if (!props.disabled) {
    dropdownContents = (
      <Tooltip title={props.selected} placement="right">
        {dropdownContents}
      </Tooltip>
    );
  }

  return (
    <div className={styles.labeledDropdown}>
      <h3>{props.label}</h3>
      <Dropdown menu={datasetMenuProps} disabled={props.disabled}>
        {dropdownContents}
      </Dropdown>
    </div>
  );
}
