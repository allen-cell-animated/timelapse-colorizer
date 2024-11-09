import { Tooltip } from "antd";
import React from "react";
import { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

type SettingsItemProps = {
  /** A string or ReactElement label. Strings will be displayed as `h3`. Defaults to empty string ("").*/
  label?: string | ReactElement;
  tooltip?: string | ReactElement;
  /** Vertical alignment of the label. Defaults to "center". */
  align?: "top" | "center" | "bottom";
  /** A formatting function that will be applied to the label. If defined, overrides `labelFormatter`
   * of the parent `SettingsContainer`. */
  labelFormatter?: (label: string | ReactElement) => string | ReactElement;
  labelStyle?: React.CSSProperties;
};

const defaultSettingsItemProps = {
  label: "",
  align: "center",
};

/**
 * Adds formatting, alignment, and an optional label to a settings input. Use with `SettingsContainer`.
 *
 * If multiple children are provided, the children will be wrapped in a `div` container.
 */
export function SettingsItem(inputProps: PropsWithChildren<Partial<SettingsItemProps>>): ReactElement {
  const props = { ...defaultSettingsItemProps, ...inputProps };

  // Determine if children is a single element or multiple. If multiple, wrap in a div.
  if (React.Children.count(props.children) !== 1) {
    props.children = <div>{props.children}</div>;
  }

  props.label = props.labelFormatter ? props.labelFormatter(props.label) : props.label;

  const labelStyle: React.CSSProperties = {};
  if (props.align === "top") {
    labelStyle.height = "min-content";
  }

  let ret = (
    <label>
      <span style={{ ...labelStyle, ...props.labelStyle }}>{props.label}</span>
      {props.children}
    </label>
  );

  if (props.tooltip) {
    ret = (
      <Tooltip title={props.tooltip} trigger={["focus", "hover"]} placement="right">
        {ret}
      </Tooltip>
    );
  }

  return ret;
}

/**
 * Styled div for the SettingsContainer.
 *
 * For all children matching the following pattern:
 * ```
 * <label>
 *   <span>Some Label Text</span>
 *   <... any element ...>
 * </label>
 * ```
 * aligns the label text and the element in grid columns.
 */
const SettingsDivContainer = styled.div<{ $labelWidth?: string; $gapPx?: number; $indentPx?: number }>`
  display: grid;

  ${(props) => {
    const spanWidth = props.$labelWidth ? props.$labelWidth : "fit-content(30%)";
    const gap = props.$gapPx ? props.$gapPx : 6;
    const indent = props.$indentPx ? props.$indentPx : 10;

    return css`
      grid-template-columns: ${spanWidth} auto;
      gap: ${gap}px;
      padding-left: ${indent}px;
    `;
  }}

  & > label {
    grid-column: 1 / 3; // Labels span both columns
    display: grid;
    grid-template-columns: subgrid;
    ${(props) => {
      // Apply same gap between elements as between rows
      return css`
        gap: ${props.$gapPx ? props.$gapPx : 6}px;
      `;
    }}
  }

  & > label > span:first-of-type {
    display: grid;
    grid-column: 1;
    align-items: center;
    text-align: right;
  }

  & > label > :not(span:first-of-type) {
    grid-column: 2;
    // Lines up the bottom of the input with the bottom of the label,
    // where the colon separator is.
    align-items: end;
  }
`;

type SettingsContainerProps = {
  labelFormatter?: (label: string | ReactElement) => string | ReactElement;
  labelWidth?: string;
  gapPx?: number;
  indentPx?: number;
  style?: React.CSSProperties;
};

const defaultSettingsContainerProps: Partial<SettingsContainerProps> = {
  labelWidth: "fit-content(30%)",
  gapPx: 6,
  indentPx: 10,
  style: {},
};

/**
 * A grid container that aligns a list of `SettingsItem` components by labels and input.
 *
 * @param labelFormatter A formatting function that will be applied to the labels of all `SettingsItem` children, unless overridden.
 * @param labelWidth CSS string used to set the width of the label column. Defaults to `"fit-content(30%)"`, where the label column
 * will be up to 30% of the `SettingsContainer`'s width..
 * If you do not want the label column to be sized automatically, set this to a fixed width or percentage (ex: `"30%"` or `"100px"`).
 * @param gapPx The vertical gap, in pixels, between each `SettingsItem` and the horizontal gap between the label
 * and settings content. 6 by default.
 * @param indentPx The left indent, in pixels, of items in the container. 10 by default.
 *
 * @example
 * ```
 * <SettingsContainer>
 *   <SettingsItem label="Name:">
 *     <input type="text" />
 *   </SettingsItem>
 *   <SettingsItem label="Reset:">
 *     <button>Reset</button>
 *   </SettingsItem>
 *   <SettingsItem>  // no label
 *     <input type="checkbox" />
 *   </SettingsItem>
 * </SettingsContainer>
 * ```
 */
export function SettingsContainer(inputProps: PropsWithChildren<Partial<SettingsContainerProps>>): ReactElement {
  const props = { ...defaultSettingsContainerProps, ...inputProps } as PropsWithChildren<
    Required<SettingsContainerProps>
  >;

  const renderChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === SettingsItem && props.labelFormatter && child.props.labelFormatter === undefined) {
          // Override label formatter if provided and the child doesn't have an override
          return React.cloneElement(child, {
            labelFormatter: props.labelFormatter,
          } as SettingsItemProps);
        } else {
          return child;
        }
      }
      return child;
    });
  };

  return (
    <SettingsDivContainer
      $gapPx={props.gapPx}
      $indentPx={props.indentPx}
      $labelWidth={props.labelWidth}
      style={props.style}
    >
      {renderChildren(props.children)}
    </SettingsDivContainer>
  );
}
