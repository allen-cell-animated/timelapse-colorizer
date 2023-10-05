import React, { ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styles from "./LabeledDropdown.module.css";
import { Dropdown, Button, Tooltip } from "antd";
import { ItemType, MenuItemType } from "antd/es/menu/hooks/useItems";
import DropdownSVG from "../assets/dropdown-arrow.svg?react";
import useToken from "antd/es/theme/useToken";
import AccessibleTooltip from "./AccessibleTooltip";

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
};

const defaultProps = {
  label: null,
  disabled: false,
  buttonType: "default",
  showTooltip: true,
};

/**
 * A wrapper around the Antd Dropdown with tooltips and a text label added.
 */
export default function LabeledDropdown(inputProps: LabeledDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LabeledDropdownProps>;

  // Support tab navigation by forcing the dropdown to stay open when clicked.
  const [forceOpen, setForceOpen] = useState(false);
  const componentContainerRef = useRef<HTMLDivElement>(null);

  // If open, close the dropdown when the user clicks outside of the component or focus is lost.
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
    // Handle focus loss for tab navigation.
    // Note that the focus loss event will fire even if the newly focused element is also
    // inside the component, so we need to check if the new target is also a child element.
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

  let dropdownButton = (
    <Button
      id={styles.dropdownButton}
      disabled={props.disabled}
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
    const className = isSelected ? ` ${styles.selected}` : "";
    return (
      <AccessibleTooltip key={item.key} title={item.label?.toString()} placement="right">
        <Button
          key={item.key}
          type={"text"}
          disabled={props.disabled}
          className={className}
          id={styles.dropdownItem}
          onClick={() => {
            props.onChange(item.key.toString());
          }}
        >
          {item.label}
        </Button>
      </AccessibleTooltip>
    );
  });

  // Can't use AccessibleTooltip because Ant passes props from Dropdown
  // to the Button through the Ant Tooltip component >:(
  // TODO: Fix AccessibleTooltip in this use case?
  // See what https://github.com/ant-design/ant-design/blob/master/components/tooltip/index.tsx is doing
  // for forwarded refs.
  const disableTooltip = props.disabled || !props.showTooltip;
  if (!disableTooltip) {
    dropdownButton = (
      <Tooltip title={selectedLabel} placement="right">
        {dropdownButton}
      </Tooltip>
    );
  }

  const [, token] = useToken();
  const dropdownStyle: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  return (
    <div className={styles.labeledDropdown} ref={componentContainerRef}>
      {props.label && <h3>{props.label}</h3>}
      <></>
      <Dropdown
        menu={{}}
        disabled={props.disabled}
        open={forceOpen || undefined}
        getPopupContainer={
          componentContainerRef.current
            ? () => {
                return componentContainerRef.current!;
              }
            : undefined
        }
        dropdownRender={(_menus: ReactNode) => {
          return (
            // Fake the menu background styling
            <div style={dropdownStyle} className={styles.dropdownContent}>
              {dropdownList}
            </div>
          );
        }}
      >
        {dropdownButton}
      </Dropdown>
    </div>
  );
}
