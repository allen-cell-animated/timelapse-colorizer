import { ButtonProps } from "antd";
import React from "react";
import { ReactElement } from "react";
import Select, { components, DropdownIndicatorProps, StylesConfig } from "react-select";
import { StateManagerProps } from "react-select/dist/declarations/src/useStateManager";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";

// React select offers a few strategies for styling the dropdown. I've elected to use
// styled-components and the classnames that react-select provides to make it consistent
// with the rest of the app.
const SelectContainer = styled.div<{ $type: ButtonProps["type"] | "outlined" }>`
  & .react-select__control {
    box-shadow: none;

    ${(props) => {
      // TODO: Can I compose this shared Ant styling? It's repeated in IconButton.tsx
      switch (props.$type) {
        case "outlined":
          return css`
            border: 1px solid var(--color-borders);
            background-color: transparent;

            &:disabled {
              border: 1px solid var(--color-borders);
              background-color: var(--color-button-disabled);
              color: var(--color-text-disabled);
              fill: var(--color-text-disabled);
            }

            &:hover {
              border: 1px solid var(--color-button);
            }
          `;

        case "primary":
        default:
          return css`
            fill: var(--color-text-button);

            &:disabled {
              fill: var(--color-text-disabled);
            }
          `;
      }
    }}

    // Note: Focus ring is visible even when not using keyboard navigation.
    // This is because browsers show the focus ring whenever an input is focused,
    // and there is no way to differentiate between navigation methods.
    &:focus-within:has(input:focus-visible) {
      // Focus ring
      box-shadow: none;
      outline: 4px solid #efe9f7 !important ;
      outline-offset: 1px;
      transition: outline-offset 0s, outline 0s;
    }

    &.react-select__control--menu-is-open {
      border: 1px solid var(--color-button-outline-active);
    }
  }
`;

const customStyles: StylesConfig = {
  control: (base, { isFocused }) => ({
    ...base,
    height: 28,
    minHeight: 28,
    width: "15vw",
    borderRadius: 6,
    borderColor: isFocused ? "var(--color-button-outline-active)" : "var(--color-borders)",
  }),
  valueContainer: (base) => ({
    ...base,
    height: 28,
    minHeight: 28,
    padding: "0 0 0 12px",
    margin: 0,
    // Adjust feature up slightly to center text
    top: "-2px",
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
  menu: (base) => ({
    ...base,
    // use standard z-index for Ant popups
    zIndex: 1050,
    width: "max-content",
    minWidth: base.width,
    maxWidth: "calc(min(50vw, 500px))",
    // Outline is caused by the shadow! Check w/ Lyndsay on whether we prefer the outline,
    // if not uncomment the below:
    // boxShadow:
    //   "rgba(0, 0, 0, 0.08) 0px 6px 16px 0px, rgba(0, 0, 0, 0.12) 0px 3px 6px -4px, rgba(0, 0, 0, 0.05) 0px 9px 28px 8px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  option: (styles, { isFocused, isSelected, isDisabled }) => ({
    ...styles,
    // Style to match Ant dropdowns
    borderRadius: 4,
    color: isSelected ? "var(--color-dropdown-text-selected)" : "black",
    backgroundColor: isDisabled
      ? undefined
      : isSelected
      ? "var(--color-dropdown-selected)"
      : isFocused
      ? "var(--color-dropdown-hover)"
      : "white",
    // Don't change background color on click.
    ":active": {
      backgroundColor: !isDisabled
        ? isSelected
          ? "var(--color-dropdown-selected)"
          : "var(--color-dropdown-hover)"
        : undefined,
    },

    // Pad to match Ant dropdowns. Default padding is "8px 12px" so adjust size to account
    // for 4px extra padding on every side.
    padding: "4px 8px",
    margin: 4,
    width: `calc(${styles.width} - 8px)`,
  }),
};

// Replace existing dropdown with custom dropdown arrow
const DropdownIndicator = (props: DropdownIndicatorProps) => {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownSVG style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" />
    </components.DropdownIndicator>
  );
};

type AntStyledSelectProps = StateManagerProps & {
  type?: ButtonProps["type"] | "outlined";
};

export default function AntStyledSelect(props: AntStyledSelectProps): ReactElement {
  return (
    <SelectContainer $type={props.type || "outlined"}>
      <Select
        {...props}
        components={{ DropdownIndicator, ...props.components }}
        styles={{ ...customStyles, ...props.styles }}
      />
    </SelectContainer>
  );
}
