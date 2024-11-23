import { Checkbox } from "antd";
import React, { PropsWithChildren, ReactElement, useContext } from "react";
import styled from "styled-components";

import { FlexColumn, FlexColumnAlignCenter, FlexRow } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";

type SettingsCategoryProps = {
  showToggle?: boolean;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  subtitle?: string;
};
const defaultProps: Partial<SettingsCategoryProps> = {
  showToggle: false,
  checked: false,
  disabled: false,
  subtitle: "",
};

const ChildrenContainer = styled.div`
  & * {
    transition: visibility 0s !important;
  }
`;

export default function SettingsCategory(inputProps: PropsWithChildren<SettingsCategoryProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<SettingsCategoryProps>>;
  const theme = useContext(AppThemeContext);

  const isToggleDisabled = props.showToggle ? props.disabled : true;
  const areChildrenVisible = props.showToggle ? props.checked : true;

  const labelId = `settings-category-label-${props.label}`;

  return (
    <FlexRow $gap={4} style={{ margin: "5px 0" }}>
      <FlexColumnAlignCenter style={{ width: "20px", marginTop: "3px" }}>
        {
          <Checkbox
            aria-labelledby={labelId}
            checked={!props.showToggle || props.checked}
            disabled={isToggleDisabled}
            onChange={(e) => {
              props.onToggle(e.target.checked);
            }}
          />
        }
      </FlexColumnAlignCenter>
      <FlexColumn style={{ width: "100%" }}>
        <h3 id={labelId}>{props.label}</h3>
        {props.subtitle && <p style={{ marginTop: 0, color: theme.color.text.hint }}>{props.subtitle}</p>}
        <ChildrenContainer style={{ marginTop: "10px", visibility: areChildrenVisible ? "visible" : "hidden" }}>
          {props.children}
        </ChildrenContainer>
      </FlexColumn>
    </FlexRow>
  );
}
