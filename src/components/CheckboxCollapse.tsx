import { Checkbox, CheckboxChangeEvent } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

type CheckboxCollapseProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  labelStyle?: React.CSSProperties;
  /** Additional elements that are placed in the same row as the checkbox and label.*/
  headerContent?: ReactNode;
  /** If true, scrolls the collapse content into view when the checkbox is clicked. */
  scrollIntoViewOnChecked?: boolean;
};

const defaultProps: Partial<CheckboxCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
  scrollIntoViewOnChecked: true,
};

const CollapseContent = styled.div<{ $collapsed?: boolean; $contentHeight: string }>`
  margin-left: 40px;
  height: ${(props) => (props.$collapsed ? "0" : props.$contentHeight)};
  transition: height 0.15s ease-in-out;
  overflow: hidden;
`;

/**
 * Collapsible area controlled by a labeled checkbox. Height changes are
 * animated and can automatically scroll the content area into view.
 */
export default function CheckboxCollapse(inputProps: PropsWithChildren<CheckboxCollapseProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [isInitialRender, setIsInitialRender] = useState(true);
  const [contentScrollHeight, setContentScrollHeight] = useState(0);
  const headerContentContainerRef = React.useRef<HTMLDivElement>(null);

  const onCheckboxChanged = useCallback(
    (e: CheckboxChangeEvent) => {
      if (props.onChange) {
        props.onChange(e.target.checked);
      }
      // Auto scroll if enabled
      if (e.target.checked && props.scrollIntoViewOnChecked && headerContentContainerRef.current) {
        setTimeout(() => {
          headerContentContainerRef.current!.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 125);
      }
    },
    [props.onChange, props.scrollIntoViewOnChecked, props.checked, isInitialRender]
  );

  // Update content scroll height whenever content changes
  useEffect(() => {
    if (headerContentContainerRef.current && headerContentContainerRef.current.scrollHeight > 0) {
      // Extra padding here to account so focus ring on some UI elements is not clipped
      setContentScrollHeight(headerContentContainerRef.current.scrollHeight);
    }
  }, [props.children]);

  useEffect(() => {
    if (contentScrollHeight !== 0 && contentScrollHeight !== 8) {
      setTimeout(() => {
        setIsInitialRender(false);
      }, 100);
    }
  }, [contentScrollHeight]);

  const id = `checkbox-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <FlexColumn>
      <FlexRowAlignCenter>
        <FlexRowAlignCenter $gap={4}>
          <Checkbox
            type="checkbox"
            id={id}
            checked={props.checked}
            onChange={onCheckboxChanged}
            disabled={props.disabled}
            // Align with default label text
            style={{ paddingTop: "2px" }}
          />
          <label htmlFor={id} style={{ ...defaultProps.labelStyle, ...props.labelStyle }}>
            {props.label} - {contentScrollHeight} - {isInitialRender ? "initial" : "rendered"}
          </label>
        </FlexRowAlignCenter>
        {props.headerContent}
      </FlexRowAlignCenter>
      <CollapseContent
        $collapsed={!props.checked}
        // Disable transition/height control on initial rendering to prevent animation every time the component is mounted
        $contentHeight={isInitialRender ? "auto" : contentScrollHeight + "px"}
        style={isInitialRender ? { transition: "none" } : undefined}
      >
        <div ref={headerContentContainerRef} style={{ padding: "8px 0" }}>
          {props.children}
        </div>
      </CollapseContent>
    </FlexColumn>
  );
}
