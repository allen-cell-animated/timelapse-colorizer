import { Checkbox, CheckboxChangeEvent } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useCallback, useEffect, useState } from "react";

import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

type CheckboxCollapseProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  labelStyle?: React.CSSProperties;
  /**
   * Additional element or elements that are placed in the same row as the
   * checkbox and label.
   */
  headerContent?: ReactNode[] | ReactNode;
  /**
   * If true (default), scrolls the collapse content into view when the checkbox
   * is clicked.
   */
  scrollIntoViewOnChecked?: boolean;
};

const defaultProps: Partial<CheckboxCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
  scrollIntoViewOnChecked: true,
};

/**
 * Collapsible area controlled by a labeled checkbox. Height changes are
 * animated and can automatically scroll the content area into view.
 */
export default function CheckboxCollapse(inputProps: PropsWithChildren<CheckboxCollapseProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [isInitialRender, setIsInitialRender] = useState(true);
  const [contentScrollHeight, setContentScrollHeight] = useState(0);
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  // Update content scroll height whenever content changes
  useEffect(() => {
    if (contentContainerRef.current && contentContainerRef.current.scrollHeight > 0) {
      setContentScrollHeight(contentContainerRef.current.scrollHeight);
      setIsInitialRender(false);
    }
  }, [props.children]);

  const onCheckboxChanged = useCallback(
    (e: CheckboxChangeEvent) => {
      if (props.onChange) {
        props.onChange(e.target.checked);
      }
      // Auto scroll if enabled
      if (e.target.checked && props.scrollIntoViewOnChecked && contentContainerRef.current) {
        // Must be delayed since the content container is expanding
        setTimeout(() => {
          contentContainerRef.current!.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 150);
      }
    },
    [props.onChange, props.scrollIntoViewOnChecked, props.checked, isInitialRender]
  );

  const id = `checkbox-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;

  const collapseHeight = props.checked ? contentScrollHeight + "px" : "0";

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
            {props.label}
          </label>
        </FlexRowAlignCenter>
        {props.headerContent}
      </FlexRowAlignCenter>
      <div
        style={{
          marginLeft: "40px",
          height: isInitialRender ? "auto" : collapseHeight,
          overflow: "hidden",
          // Disable transition/height control on initial rendering to prevent animation every time the component is mounted
          transition: isInitialRender ? "none" : "height 0.15s ease-in-out",
        }}
      >
        <div ref={contentContainerRef} style={{ padding: "8px 0" }}>
          {props.children}
        </div>
      </div>
    </FlexColumn>
  );
}
