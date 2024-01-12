import React from "react";
import { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

/**
 * A grid container that aligns a list of `SettingsItem` components by labels and input.
 *
 * @param spanWidth CSS string used to set the width of the label column. Defaults to `"fit-content(30%)"`, where the label column
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

export const SettingsContainer = styled.div<{ spanWidth?: string; gapPx?: number; indentPx?: number }>`
  display: grid;

  ${(props) => {
    const spanWidth = props.spanWidth ? props.spanWidth : "fit-content(30%)";
    const gap = props.gapPx ? props.gapPx : 6;
    const indent = props.indentPx ? props.indentPx : 10;

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
        gap: ${props.gapPx ? props.gapPx : 6}px;
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

type SettingsItemProps = {
  /** A string or ReactElement label. Strings will be displayed as `h3`. Defaults to empty string ("").*/
  label: string | ReactElement;
};

const defaultSettingsItemProps = {
  label: "",
};

/**
 * Adds formatting, alignment, and an optional label to a settings input. Use with `SettingsContainer`.
 *
 * If multiple children are provided, the children will be wrapped in a `div` container.
 */
export function SettingsItem(inputProps: PropsWithChildren<Partial<SettingsItemProps>>): ReactElement {
  const props = { ...defaultSettingsItemProps, ...inputProps } as PropsWithChildren<Required<SettingsItemProps>>;

  // Determine if children is a single element or multiple. If multiple, wrap in a div.
  if (React.Children.count(props.children) !== 1) {
    props.children = <div>{props.children}</div>;
  }

  if (typeof props.label === "string") {
    props.label = <h3>{props.label}</h3>;
  }

  return (
    <label>
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
