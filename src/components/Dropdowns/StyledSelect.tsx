import { ButtonProps } from "antd";
import React, { ReactElement, useMemo } from "react";
import Select, { components, DropdownIndicatorProps, StylesConfig } from "react-select";
import { StateManagerProps } from "react-select/dist/declarations/src/useStateManager";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";

import { AppTheme, AppThemeContext } from "../AppStyle";

type AntStyledSelectProps = StateManagerProps & {
  type?: ButtonProps["type"] | "outlined";
  width?: string;
};

// Styling is done via both styled-components and react-select's `styles` prop.
const SelectContainer = styled.div<{ $type: ButtonProps["type"] | "outlined" }>`
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), width;

  & .react-select--is-disabled {
    cursor: not-allowed;
    pointer-events: unset;
  }

  & .react-select__control {
    box-shadow: none;

    ${(props) => {
      // TODO: Can this be composed with Ant styling? It's similar to IconButton.tsx
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
            background-color: var(--color-button);
            fill: var(--color-text-button);

            &:not(.react-select__control--is-disabled) {
              color: var(--color-text-button);
            }

            &:not(.react-select__control--menu-is-open):not(.react-select__control--is-disabled) {
              border-color: transparent;
            }

            &:hover {
              background-color: var(--color-button-hover);
            }

            &.react-select__control--is-focused .react-select__single-value {
              color: var(--color-theme-light);
            }

            & .react-select__single-value,
            & .react-select__input-container {
              color: var(--color-text-button);
            }

            &:disabled {
              fill: var(--color-text-disabled);
            }
          `;
      }
    }}

    &.react-select__control--is-disabled {
      // Disabled styling
      cursor: not-allowed;
      background-color: var(--color-button-disabled);
      border-color: var(--color-borders);
      fill: var(--color-text-disabled);
      color: var(--color-text-disabled);
    }

    &.react-select__control--control-is-focused .react-select__single-value {
      // Fade text when dropdown input is selected
      opacity: 0.75;
    }

    &:focus-within:has(input:focus-visible) {
      // Focus ring
      box-shadow: none;
      outline: 2px solid #efe9f7 !important;
      outline-offset: 0px;
      transition: outline-offset 0s, outline 0s;
    }

    &.react-select__control--menu-is-open {
      border: 1px solid var(--color-button-outline-active);
    }
  }
`;

const getCustomStyles = (theme: AppTheme, width: string): StylesConfig => ({
  control: (base, { isFocused }) => ({
    ...base,
    height: theme.controls.height,
    minHeight: theme.controls.height,
    width: width,
    borderRadius: theme.controls.radiusLg,
    borderColor: isFocused ? theme.color.button.outlineActive : theme.color.layout.borders,
  }),
  valueContainer: (base) => ({
    ...base,
    height: theme.controls.height,
    minHeight: theme.controls.height,
    padding: "0 0 0 12px",
    margin: 0,
    // Adjust feature up slightly to center text
    top: "-2px",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: theme.controls.height - 2,
    color: undefined,
  }),
  // Hide vertical separator bar and use default font color for the dropdown indicator
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (styles) => ({
    ...styles,
    color: undefined, // Use default font colors, allow CSS control
    padding: "8px 6px",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ":hover": {
      color: "undefined",
    },
  }),
  // Fix z-ordering of the dropdown menu and adjust width to fit content
  menu: (base) => ({
    ...base,
    zIndex: 1050, // Standard z-index for Ant Design popups
    width: "max-content",
    minWidth: base.width,
    maxWidth: "calc(min(50vw, 500px))",
    borderRadius: theme.controls.radiusLg,
    // Ant popup menu shadow style
    boxShadow:
      " rgba(0, 0, 0, 0.08) 0px 6px 16px 0px, rgba(0, 0, 0, 0.12) 0px 3px 6px -4px, rgba(0, 0, 0, 0.05) 0px 9px 28px 8px;",
  }),
  menuList: (base) => ({
    ...base,
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }),
  option: (styles, { isFocused, isSelected, isDisabled }) => ({
    ...styles,
    // Style to match Ant dropdowns
    borderRadius: 4,
    padding: "4px 8px",
    width: `calc(${styles.width})`,
    color: isSelected ? theme.color.dropdown.textSelected : theme.color.text.primary,
    backgroundColor: isDisabled
      ? undefined
      : isSelected
      ? theme.color.dropdown.backgroundSelected
      : isFocused
      ? theme.color.dropdown.backgroundHover
      : "white",
    // Don't change background color on click.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ":active": {
      backgroundColor: !isDisabled
        ? isSelected
          ? theme.color.dropdown.backgroundSelected
          : theme.color.dropdown.backgroundHover
        : undefined,
    },
  }),
});

// Replace existing dropdown with custom dropdown arrow
// TODO: Show loading indicator here?
const DropdownIndicator = (props: DropdownIndicatorProps): ReactElement => {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownSVG style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" />
    </components.DropdownIndicator>
  );
};

// TODO: Add open/close animation to Menu; see similar implementation in
// ColorRampDropdown.css.

/**
 * A wrapper around the `react-select` `Select` component that mimics the style of the
 * Ant Design library.
 *
 * Note that providing a `styles` prop may cause conflicts with existing style overrides
 * in this component.
 */
export default function AntStyledSelect(props: AntStyledSelectProps): ReactElement {
  const theme = React.useContext(AppThemeContext);
  const customStyles = useMemo(() => getCustomStyles(theme, props.width ?? "15vw"), [theme]);

  return (
    <SelectContainer $type={props.type || "outlined"}>
      <Select
        {...props}
        menuPlacement={props.menuPlacement || "auto"}
        components={{ DropdownIndicator, ...props.components }}
        styles={{ ...customStyles, ...props.styles }}
      />
    </SelectContainer>
  );
}
