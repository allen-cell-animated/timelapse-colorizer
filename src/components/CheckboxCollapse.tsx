import { Checkbox } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useEffect, useState } from "react";
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
  /** If true, scrolls the collapse content into view when checkbox is checked. */
  scrollIntoViewOnChecked?: boolean;
};

const defaultProps: Partial<CheckboxCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
  scrollIntoViewOnChecked: true,
};

const CollapseContent = styled.div<{ $collapsed?: boolean; $maxHeight: string }>`
  margin-left: 40px;
  height: ${(props) => (props.$collapsed ? "0" : props.$maxHeight)};
  transition: height 0.15s ease-in-out;
  overflow: hidden;
`;

export default function CheckboxCollapse(inputProps: PropsWithChildren<CheckboxCollapseProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const id = `checkbox-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;
  const headerContentContainerRef = React.useRef<HTMLDivElement>(null);

  const [contentScrollHeight, setContentScrollHeight] = useState(0);

  useEffect(() => {
    if (props.scrollIntoViewOnChecked && props.checked && headerContentContainerRef.current) {
      setTimeout(() => {
        headerContentContainerRef.current!.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [props.scrollIntoViewOnChecked, props.checked]);

  useEffect(() => {
    if (headerContentContainerRef.current) {
      // Extra padding here to account so focus ring on some UI elements is not clipped
      setContentScrollHeight(headerContentContainerRef.current.scrollHeight + 8);
    }
  }, [props.children]);

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
            // Align with default label text
            style={{ paddingTop: "2px" }}
          />
          <label htmlFor={id} style={props.labelStyle}>
            {props.label}
          </label>
        </FlexRowAlignCenter>
        {props.headerContent}
      </FlexRowAlignCenter>
      <CollapseContent $collapsed={!props.checked} $maxHeight={contentScrollHeight + "px"}>
        <div ref={headerContentContainerRef}>{props.children}</div>
      </CollapseContent>
    </FlexColumn>
  );
}
