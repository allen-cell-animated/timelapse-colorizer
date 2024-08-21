import { ButtonProps } from "antd";
import React, { ReactNode, useMemo } from "react";
import { ReactElement } from "react";
import Select, { components, DropdownIndicatorProps, StylesConfig } from "react-select";
import { StateManagerProps } from "react-select/dist/declarations/src/useStateManager";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";

import { AppTheme, AppThemeContext } from "../AppStyle";

type AntStyledSelectProps = StateManagerProps & {
  type?: ButtonProps["type"] | "outlined";
  width?: string;
};

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
    color: undefined,
  }),
  // Fix z-ordering of the dropdown menu and adjust width to fit content
  menu: (base) => ({
    ...base,
    zIndex: 1050, // Standard z-index for Ant Design popups
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

    // Pad to match Ant dropdowns. Default padding is "8px 12px" so adjust size to account
    // for 4px extra padding on every side.
    padding: "4px 8px",
    margin: 4,
    width: `calc(${styles.width} - 8px)`,
  }),
});

// Replace existing dropdown with custom dropdown arrow
const DropdownIndicator = (props: DropdownIndicatorProps): ReactNode => {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownSVG style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" />
    </components.DropdownIndicator>
  );
};

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
        components={{ DropdownIndicator, ...props.components }}
        styles={{ ...customStyles, ...props.styles }}
      />
    </SelectContainer>
  );
}
