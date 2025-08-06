import { Checkbox } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode } from "react";
import styled from "styled-components";

import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

type CheckboxCollapseProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  labelStyle?: React.CSSProperties;
  /** Additional elements that are placed in the same row after the checkbox and label. */
  headerContent?: ReactNode;
};

const defaultProps: Partial<CheckboxCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
};

const CollapseContent = styled.div<{ $collapsed?: boolean }>`
  padding-left: 40px;
  height: ${(props) => (props.$collapsed ? "0" : "fit-content")};
  transition: height 2s ease-in-out;
  overflow: clip;
`;

export default function CheckboxCollapse(inputProps: PropsWithChildren<CheckboxCollapseProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const id = `checkbox-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <FlexColumn>
      <FlexRowAlignCenter>
        <FlexRowAlignCenter $gap={4}>
          <Checkbox
            type="checkbox"
            id={id}
            checked={props.checked}
            onChange={(e) => (props.onChange ? props.onChange(e.target.checked) : null)}
            disabled={props.disabled}
          />
          <label htmlFor={id} style={props.labelStyle}>
            {props.label}
          </label>
        </FlexRowAlignCenter>
        {props.headerContent}
      </FlexRowAlignCenter>
      <CollapseContent $collapsed={!props.checked}>{props.children}</CollapseContent>
    </FlexColumn>
  );
}
