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
  };

  return (
    <div className={styles.labeledDropdown}>
      {props.label}
      <Dropdown menu={datasetMenuProps} disabled={props.disabled}>
        <Tooltip title={props.selected} placement="right">
          <Button disabled={props.disabled} type={props.buttonType}>
            <div className={styles.buttonContents}>
              <div className={styles.buttonText}>{props.selected}</div>
              <DownOutlined />
            </div>
          </Button>
        </Tooltip>
      </Dropdown>
    </div>
  );
}
