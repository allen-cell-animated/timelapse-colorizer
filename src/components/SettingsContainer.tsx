import React, { useEffect } from "react";
import { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

import { removeUndefinedProperties } from "../state/utils/data_validation";

const SETTINGS_ITEM_CLASS = "settings-item";
export const DEFAULT_SETTINGS_LABEL_WIDTH_PX = 100;

type SettingsItemProps = {
  /** A string or ReactElement label, placed inside of a `label` tag.*/
  label?: string | ReactElement;
  /** HTML ID applied to the `label` element.*/
  labelId?: string;
  /** HTML `for` attribute applied to the `label` element. */
  htmlFor?: string;
  labelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  isNonFormComponent?: boolean;
};

const defaultLabelStyle: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  lineHeight: 1.25,
  margin: "3px 0",
};

/**
 * Adds formatting, alignment, and an optional label to a settings input. Use with `SettingsContainer`.
 *
 * If multiple children are provided, the children will be wrapped in a `div` container.
 */
export function SettingsItem(inputProps: PropsWithChildren<Partial<SettingsItemProps>>): ReactElement {
  const props = { ...inputProps }; // Need to copy props to edit children

  // Determine if children is a single element or multiple. If multiple, wrap in a div.
  if (React.Children.count(props.children) !== 1) {
    props.children = <div>{props.children}</div>;
  }

  useEffect(() => {
    if (props.label && !props.htmlFor && !props.isNonFormComponent) {
      console.warn(
        "SettingsItem: Please set the 'htmlFor' attribute to support screen readers in setting '" + props.label + "'."
      );
    }
  }, [props.label, props.htmlFor]);

  let labelElement = <div></div>;
  if (props.label && !props.isNonFormComponent) {
    labelElement = (
      <label style={{ ...defaultLabelStyle, ...props.labelStyle }} id={props.labelId} htmlFor={props.htmlFor}>
        {props.label}
      </label>
    );
  } else if (props.label && props.isNonFormComponent) {
    labelElement = (
      <div style={{ ...defaultLabelStyle, ...props.labelStyle }} id={props.labelId}>
        {props.label}
      </div>
    );
  }

  return (
    <div style={props.style} className={SETTINGS_ITEM_CLASS}>
      {labelElement}
      {props.children}
    </div>
  );
}

/**
 * Styled div for the SettingsContainer.
 *
 * For all children matching the following pattern:
 * ```
 * <div className="settings-item">
 *   <any>Some Label Text</any>
 *   <... any element ...>
 * </div>
 * ```
 * aligns the label text and the element in grid columns.
 */
const SettingsDivContainer = styled.div<{ $labelWidth: string; $gapPx: number; $indentPx: number }>`
  display: grid;

  ${(props) => {
    const spanWidth = props.$labelWidth;
    const gap = props.$gapPx;
    const indent = props.$indentPx;

    return css`
      grid-template-columns: ${spanWidth} auto;
      gap: ${gap}px;
      padding-left: ${indent}px;
    `;
  }}

  & > div.${SETTINGS_ITEM_CLASS} {
    grid-column: 1 / 3; // Labels span both columns
    display: grid;
    grid-template-columns: subgrid;
    ${(props) => {
      // Apply same gap between elements as between rows
      return css`
        gap: ${props.$gapPx ? props.$gapPx : 6}px;
      `;
    }}

    & > :first-child {
      display: grid;
      grid-column: 1;
      align-items: center;
      text-align: left;
    }

    & > :not(:first-child) {
      grid-column: 2;
      // Lines up the bottom of the input with the bottom of the label,
      // where the colon separator is.
      align-items: end;
    }
  }
`;

type SettingsContainerProps = {
  labelWidth?: string;
  gapPx?: number;
  indentPx?: number;
  style?: React.CSSProperties;
};

const defaultSettingsContainerProps = {
  labelWidth: `${DEFAULT_SETTINGS_LABEL_WIDTH_PX}px`,
  gapPx: 6,
  indentPx: 0,
};

/**
 * A grid container that aligns a list of `SettingsItem` components by labels and input.
 *
 * @param $labelWidth CSS string used to set the width of the label column. Defaults to `"fit-content(30%)"`, where the label column
 * will be up to 30% of the `SettingsContainer`'s width..
 * If you do not want the label column to be sized automatically, set this to a fixed width or percentage (ex: `"30%"` or `"100px"`).
 * @param $gapPx The vertical gap, in pixels, between each `SettingsItem` and the horizontal gap between the label
 * and settings content. 6 by default.
 * @param $indentPx The left indent, in pixels, of items in the container. 10 by default.
 *
 * @example
 * ```
 * <SettingsContainer>
 *   <SettingsItem label="Name:" htmlFor="name-input">
 *     <input type="text" id="name-input"/>
 *   </SettingsItem>
 *   <SettingsItem label="Reset:" htmlFor="reset-button">
 *     <button id="reset-button">Reset</button>
 *   </SettingsItem>
 *   <SettingsItem>  // no label
 *     <input type="checkbox" />
 *   </SettingsItem>
 * </SettingsContainer>
 * ```
 */
export function SettingsContainer(inputProps: PropsWithChildren<Partial<SettingsContainerProps>>): ReactElement {
  const props = { ...defaultSettingsContainerProps, ...removeUndefinedProperties(inputProps) };

  return (
    <SettingsDivContainer
      $gapPx={props.gapPx}
      $indentPx={props.indentPx}
      $labelWidth={props.labelWidth}
      style={props.style}
    >
      {props.children}
    </SettingsDivContainer>
  );
}
