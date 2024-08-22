import { LoadingOutlined } from "@ant-design/icons";
import { ButtonProps, Select } from "antd";
import Fuse from "fuse.js";
import React, { ReactElement, ReactNode, useContext, useMemo, useRef, useState, useTransition } from "react";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexRowAlignCenter } from "../../styles/utils";

import { AppTheme, AppThemeContext } from "../AppStyle";

// TODO: Have the dropdown show a loading indicator after a selection has been made
// but before the prop value updates. -> this is especially noticeable when slow datasets.
// Is there a way we can do this using async promises, maybe? If the promise rejects,
// discard the changed value?

export type SelectOptionType = {
  value: string;
  label: string | ReactNode;
};

type SelectionDropdownProps = {
  /** Text label to include with the dropdown. If null or undefined, hides the label. */
  label?: string | null;
  /** The id of an element that labels this selection dropdown. */
  labelledBy?: string;
  /** The key of the item that is currently selected. */
  selected: string;
  /** An array of ItemType that describes the item properties (`{key, label}`),
   * or an array of strings. Dropdown items will be presented in the provided array order.
   *
   * If a string array is provided, ItemType objects will be
   * auto-generated with `key` and `label` values set to the string.*/
  items: SelectOptionType[] | string[];
  disabled?: boolean;
  /** The type of button to render for the dropdown. See Antd's button types:
   * https://ant.design/components/button#components-button-demo-basic */
  buttonType?: ButtonProps["type"] | "outlined";
  /** Callback that is fired whenever an item in the dropdown is selected.
   * The callback will be passed the `key` of the selected item. */
  onChange: (key: string) => void;
  /**
   * Whether to show a tooltip when hovering over the main Select input area.
   * Useful when the selected item's label is too long to fit in the dropdown area
   * and must be truncated.
   *
   */
  showSelectedTooltip?: boolean;
  /** Width of the dropdown. Overrides the default sizing behavior if set. */
  width?: string | null;
  /**
   * Whether the search bar should be enabled. If enabled, will show search bar and filter
   * by search input when the total number of items is above `searchThresholdCount`. True by default.
   */
  enableSearch?: boolean;
};

const defaultProps: Partial<SelectionDropdownProps> = {
  label: null,
  disabled: false,
  buttonType: "outlined",
  showSelectedTooltip: true,
  width: null,
  enableSearch: true,
};

const SelectContainer = styled(FlexRowAlignCenter)<{ theme: AppTheme; $type: SelectionDropdownProps["buttonType"] }>`
  ${({ theme, $type }) => {
    return css`
      & .ant-select {
      }

      & .ant-select-dropdown {
        .ant-select-item:not(:last-child) {
          margin-bottom: 2px;
        }
        .ant-select-item:not(:first-child) {
          margin-top: 2px;
        }

        .ant-select-item-option-active {
          background-color: ${theme.color.dropdown.backgroundHover};
          color: ${theme.color.dropdown.textHover};
        }

        .ant-select-item-option-selected {
          background-color: ${theme.color.dropdown.backgroundSelected};
          color: ${theme.color.dropdown.textSelected};
        }
      }
    `;
  }}
`;

/**
 * An wrapper around an AccessibleDropdown that allows for the selection of a single item from a list.
 *
 * Items can be passed in as an array of strings, or as an array of ItemType objects if you need the
 * keys to differ from the labels.
 */
export default function SelectionDropdown(inputProps: SelectionDropdownProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SelectionDropdownProps>;

  const [isPending, startTransition] = useTransition();
  const theme = useContext(AppThemeContext);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filteredItems, setFilteredItems] = useState<SelectOptionType[]>([]);

  // Convert items into SelectOptionType, adding missing properties as needed
  const items = useMemo((): SelectOptionType[] => {
    if (props.items.length === 0) {
      return [];
    }
    if (typeof props.items[0] === "string") {
      // string array instead of ItemType array
      return (props.items as string[]).map((name) => {
        return {
          label: name,
          value: name,
        };
      });
    } else {
      return props.items as SelectOptionType[];
    }
  }, [props.items]);

  // Set up fuse for fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["key", "label"],
      isCaseSensitive: false,
      shouldSort: true, // sorts by match score
    });
  }, [props.items]);

  // Filter the items based on the search input
  useMemo(() => {
    if (searchInput === "") {
      startTransition(() => {
        // Reset to original list
        setFilteredItems(items);
      });
    } else {
      const searchResult = fuse.search(searchInput);
      const filteredItems = searchResult.map((result) => result.item);
      startTransition(() => {
        setFilteredItems(filteredItems);
      });
    }
  }, [searchInput, items]);

  // TODO: Allow option to include tooltips for elements.
  // This may require injecting an invisible div to intercept mouse events and show the tooltips, but it's
  // unclear without experimentation whether it will also work with keyboard nav and focus.
  // Currently disabled due to issues with tooltip positioning.
  //
  // const optionRender = (
  //   option: DefaultOptionType & { data: SelectOptionType },
  //   _info: { index: number }
  // ): ReactNode => {
  //   return (
  //     <Tooltip title={option.label} placement="right" trigger={["hover", "focus"]}>
  //       <span style={{ maxWidth: "100%", textOverflow: "ellipsis", width: "100%", textWrap: "wrap" }}>
  //         {option.data.label}
  //       </span>
  //     </Tooltip>
  //   );
  // };

  const mainButtonStyle: React.CSSProperties = {
    width: props.width || "15vw",
    minWidth: "60px",
    maxWidth: "270px",
  };

  const isPendingExtended = useDebounce(isPending, 400) && isPending;
  const icon = isPendingExtended ? (
    <LoadingOutlined style={{ fontSize: "12px" }} />
  ) : (
    <DropdownSVG style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" />
  );

  return (
    <SelectContainer $gap={6} ref={popupContainerRef} theme={theme}>
      <h3>{props.label}</h3>
      <div style={{ position: "relative" }}>
        <Select
          options={filteredItems}
          style={mainButtonStyle}
          placeholder="Select an item"
          value={props.selected}
          disabled={props.disabled}
          popupMatchSelectWidth={false}
          onChange={(value) => {
            props.onChange(value);
            startTransition(() => {
              setSearchInput("");
            });
          }}
          // Disable ant's default filtering and use our own fuzzy search logic
          filterOption={false}
          showSearch={props.enableSearch}
          onSearch={(searchInput) => {
            startTransition(() => {
              setSearchInput(searchInput);
            });
          }}
          loading={isPending}
          suffixIcon={icon}
          getPopupContainer={popupContainerRef.current ? () => popupContainerRef.current! : undefined}
          notFoundContent="No matches found"
        ></Select>
        {/* <Tooltip title="wow!">
          <div
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: theme.controls.height,
              position: "absolute",
            }}
          ></div>
        </Tooltip> */}
      </div>
    </SelectContainer>
  );
}
