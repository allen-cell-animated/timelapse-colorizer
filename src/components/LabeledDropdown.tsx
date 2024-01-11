import React, { ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styles from "./LabeledDropdown.module.css";
import { Dropdown, Button, Tooltip } from "antd";
import { ItemType, MenuItemType } from "antd/es/menu/hooks/useItems";
import useToken from "antd/es/theme/useToken";
import { DropdownSVG } from "../assets";

type LabeledDropdownProps = {
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
  buttonType?: "primary" | "default" | "dashed" | "text" | "link";
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
  buttonType: "default",
  showTooltip: true,
  width: null,
  style: {},
};

/**
 * A wrapper around the Antd Dropdown with tooltips and a text label added.
 */
export default function LabeledDropdown(inputProps: LabeledDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LabeledDropdownProps>;

  // TODO: Consider refactoring this into a shared hook if this behavior is repeated again.
  // Support tab navigation by forcing the dropdown to stay open when clicked.
  const [forceOpen, setForceOpen] = useState(false);
  const componentContainerRef = useRef<HTMLLabelElement>(null);

  // If open, close the dropdown when focus is lost.
  // Note that the focus out event will fire even if the newly focused element is also
  // inside the component, so we need to check if the new target is also a child element.
  useEffect(() => {
    if (!forceOpen) {
      return;
    }
    const doesContainTarget = (target: EventTarget | null): boolean => {
      return (
        (target instanceof Element &&
          componentContainerRef.current &&
          componentContainerRef.current.contains(target)) ||
        false
      );
    };
    const handleFocusLoss = (event: FocusEvent): void => {
      if (!doesContainTarget(event.relatedTarget)) {
        setForceOpen(false);
      }
    };

    componentContainerRef.current?.addEventListener("focusout", handleFocusLoss);
    return () => {
      componentContainerRef.current?.removeEventListener("focusout", handleFocusLoss);
    };
  }, [forceOpen]);

  // Set up the items for the dropdown menu
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

  const selectedLabel = useMemo((): string => {
    for (const item of items) {
      if (item && item.key === props.selected) {
        return item.label?.toString() || "";
      }
    }
    return "";
  }, [props.selected, items]);

  const dropdownButton = (
    <Button
      id={styles.dropdownButton}
      disabled={props.disabled}
      style={props.width ? { width: props.width } : undefined}
      type={props.buttonType}
      className={forceOpen ? styles.forceOpen : ""}
      // Open the button when clicked for accessibility
      onClick={() => setForceOpen(!forceOpen)}
    >
      <div className={styles.buttonContents}>
        <div className={styles.buttonText}>{selectedLabel}</div>
        <DropdownSVG className={`${styles.buttonIcon} ${styles[props.buttonType || "default"]}`} />
      </div>
    </Button>
  );

  // Completely customize the dropdown menu and make the buttons manually.
  // This is because Antd's Dropdown component doesn't allow us to add item tooltips, and complicates
  // other behaviors (like tab navigation or setting width).
  // Ant recommends using the Popover component for this instead of Dropdown, but they use
  // different animation styling (Dropdown looks nicer).
  const dropdownList: ReactElement[] = items.map((item) => {
    const isSelected = item.key === props.selected;
    const className = styles.dropdownItem + (isSelected ? ` ${styles.selected}` : "");
    return (
      <Tooltip key={item.key} title={item.label?.toString()} placement="right" trigger={["hover", "focus"]}>
        <Button
          key={item.key}
          type={"text"}
          disabled={props.disabled}
          rootClassName={className}
          onClick={() => {
            props.onChange(item.key.toString());
          }}
        >
          {item.label}
        </Button>
      </Tooltip>
    );
  });

  const disableTooltip = props.disabled || !props.showTooltip;

  const [, token] = useToken();
  const dropdownStyle: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  if (props.width) {
    dropdownStyle.width = props.width;
  }

  return (
    <label className={styles.labeledDropdown} ref={componentContainerRef} style={props.style}>
      {props.label && (
        <span>
          <h3>{props.label}</h3>
        </span>
      )}
      <Dropdown
        menu={{}}
        disabled={props.disabled}
        open={forceOpen || undefined}
        getPopupContainer={componentContainerRef.current ? () => componentContainerRef.current! : undefined}
        dropdownRender={(_menus: ReactNode) => {
          return (
            // Fake the menu background styling
            <div style={dropdownStyle} className={styles.dropdownContent}>
              {dropdownList}
            </div>
          );
        }}
      >
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={disableTooltip ? false : undefined}
          title={selectedLabel}
          placement="right"
          trigger={["hover", "focus"]}
        >
          {dropdownButton}
        </Tooltip>
      </Dropdown>
    </label>
  );
}
