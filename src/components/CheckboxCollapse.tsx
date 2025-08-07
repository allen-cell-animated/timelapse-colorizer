import { Checkbox, CheckboxChangeEvent } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useCallback, useEffect, useState } from "react";

import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

const ANIMATION_DURATION_MS = 150;

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
  const [contentHeight, setContentHeight] = useState(0);
  const [hideOverflow, setHideOverflow] = useState(false);
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  // Update content scroll height whenever content changes
  useEffect(() => {
    // The height may be 0 when the component is not visible (such as in Ant's
    // Tab component), so zero height values must be ignored.
    if (contentContainerRef.current && contentContainerRef.current.scrollHeight > 0) {
      setContentHeight(contentContainerRef.current.offsetHeight);
      setIsInitialRender(false);
    }
  }, [props.children]);

  useEffect(() => {
    // Hiding overflow must be disabled once the content is fully expanded to
    // prevent dropdown menus and other popovers from being clipped, but
    // `overflow` cannot be animated using CSS transitions.
    if (props.checked) {
      setTimeout(() => {
        setHideOverflow(false);
      }, ANIMATION_DURATION_MS);
    } else {
      setHideOverflow(true);
    }
  }, [props.checked]);

  const onCheckboxChanged = useCallback(
    (e: CheckboxChangeEvent) => {
      if (props.onChange) {
        props.onChange(e.target.checked);
      }
      // Auto scroll if enabled. Note that this will only trigger  to user
      // interaction (clicking) to prevent unwanted scrolling when the collapse
      // is expanded from props.
      if (e.target.checked && props.scrollIntoViewOnChecked && contentContainerRef.current) {
        // Must be delayed since the content container is expanding
        setTimeout(() => {
          contentContainerRef.current!.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            // container: "nearest",
          });
        }, ANIMATION_DURATION_MS + 10);
      }
    },
    [props.onChange, props.scrollIntoViewOnChecked, props.checked, isInitialRender]
  );

  const id = `checkbox-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;

  const collapseHeight = props.checked ? contentHeight + "px" : "0";
  // Disable transition on initial rendering so the collapse does not animate
  const heightTransitionDuration = isInitialRender ? "0ms" : `${ANIMATION_DURATION_MS}ms`;

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
          overflow: hideOverflow ? "hidden" : "visible",
          transition: `height ${heightTransitionDuration} ease-in-out`,
        }}
      >
        <div ref={contentContainerRef} style={{ padding: "8px 0" }}>
          {props.children}
        </div>
      </div>
    </FlexColumn>
  );
}
