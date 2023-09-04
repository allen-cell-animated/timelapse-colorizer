import React, { useMemo } from "react";
import styles from "./LabeledDropdown.module.css";
import { Dropdown, Tooltip, Button, MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { ItemType } from "antd/es/menu/hooks/useItems";

type LabeledDropdownProps = {
  label: string;
  selected: string;
  items: ItemType[] | string[];
  disabled?: boolean;
  buttonType?: "primary" | "default" | "dashed" | "text" | "link";
  onChange: (value: string) => void;
};

export default function LabeledDropdown(props: LabeledDropdownProps) {
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
    defaultSelectedKeys: [props.selected],
    // TODO: Override render property for menu to add text clipping + tooltips for long entries
  };

  let dropdownContents = (
    <Button disabled={props.disabled} type={props.buttonType} rootClassName={styles.button}>
      <div className={styles.buttonContents}>
        <div className={styles.buttonText}>{props.selected}</div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${styles.buttonIcon} ${styles[props.buttonType || "default"]}`}
          width="14"
          height="14"
          viewBox="0 0 12 12"
        >
          <path d="M1.11652 3.1204C1.30891 2.94718 1.6053 2.96271 1.77853 3.1551L6.0059 7.85006L10.2333 3.1551C10.4065 2.96271 10.7029 2.94718 10.8953 3.12041C11.0876 3.29363 11.1032 3.59002 10.9299 3.78241L6.37171 8.84486C6.27496 8.9523 6.1398 9.00459 6.00579 8.99963C5.87185 9.00453 5.73678 8.95224 5.64008 8.84485L1.08183 3.78241C0.908604 3.59002 0.924137 3.29363 1.11652 3.1204Z" />
        </svg>
      </div>
    </Button>
  );

  // Add a tooltip for the currently selected element.
  // Workaround: Remove the tooltip when the dropdown is disabled, as otherwise it introduces a span element that messes with the height of the button.
  if (!props.disabled) {
    dropdownContents = (
      <Tooltip title={props.selected} placement="right">
        {dropdownContents}
      </Tooltip>
    );
  }

  return (
    <div className={styles.labeledDropdown}>
      {props.label}
      <Dropdown menu={datasetMenuProps} disabled={props.disabled} rootClassName={styles.dropdown}>
        {dropdownContents}
      </Dropdown>
    </div>
  );
}
