import { CaretDownFilled, CaretUpFilled } from "@ant-design/icons";
import { Switch } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { FlexColumn, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";
import TextButton from "./Buttons/TextButton";

const ANIMATION_DURATION_MS = 150;

type ToggleCollapseProps = {
  label: string;
  labelStyle?: React.CSSProperties;
  /**
   * If defined, includes a toggle switch in the header row with this checked
   * state. Changes to this state will also trigger collapse/expand behavior.
   */
  toggleChecked?: boolean;
  onToggleChange?: (checked: boolean) => void;
  toggleDisabled?: boolean;
  /**
   * Additional element or elements that are placed in the same row as the
   * label (and toggle switch, if included).
   */
  headerContent?: ReactNode[] | ReactNode;
  /**
   * If true (default), scrolls the collapse content into view when the toggle
   * switch is checked.
   */
  scrollIntoViewOnChecked?: boolean;
  contentIndentPx?: number;
};

const defaultProps: Partial<ToggleCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
  scrollIntoViewOnChecked: true,
  contentIndentPx: 40,
};

/**
 * Labeled collapsible area, with an optional toggle control. Height changes are
 * animated, and the component can automatically scroll the content area into
 * view.
 */
export default function ToggleCollapse(inputProps: PropsWithChildren<ToggleCollapseProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const theme = useContext(AppThemeContext);
  const [isExpanded, setIsExpanded] = useState(props.toggleChecked ?? true);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [hideOverflow, setHideOverflow] = useState(false);
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync expanded state with toggle state
  useEffect(() => {
    if (props.toggleChecked !== undefined) {
      setIsExpanded(props.toggleChecked);
    }
  }, [props.toggleChecked]);

  // Update content scroll height whenever content changes
  useEffect(() => {
    // The height may be 0 when the component is not visible (such as in Ant's
    // Tab component), so zero height values must be ignored.
    if (contentContainerRef.current && contentContainerRef.current.scrollHeight > 0) {
      setContentHeight(contentContainerRef.current.offsetHeight);
      setIsInitialRender(false);
    }
  }, [props.children]);

  // Manage overflow visibility during expansion and collapse
  useEffect(() => {
    // Hiding overflow must be disabled once the content is fully expanded to
    // prevent dropdown menus and other popovers from being clipped, but
    // `overflow` cannot be animated using CSS transitions.
    if (isExpanded) {
      setTimeout(() => {
        setHideOverflow(false);
      }, ANIMATION_DURATION_MS);
    } else {
      setHideOverflow(true);
    }
  }, [isExpanded]);

  //// Helper methods ////

  const expandAndScrollIntoView = useCallback(() => {
    // Note that the scroll into view behavior is only triggered from
    // user interaction, to prevent unexpected scrolling on initial render.
    setIsExpanded(true);
    // Must be delayed since the content container is expanding
    setTimeout(() => {
      contentContainerRef.current!.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, ANIMATION_DURATION_MS + 10);
  }, [contentContainerRef]);

  const onCheckboxChanged = useCallback(
    (checked: boolean) => {
      if (props.onToggleChange) {
        props.onToggleChange(checked);
      }
      if (!isExpanded && checked && props.scrollIntoViewOnChecked && contentContainerRef.current) {
        expandAndScrollIntoView();
      }
    },
    [
      props.onToggleChange,
      props.scrollIntoViewOnChecked,
      props.toggleChecked,
      isInitialRender,
      isExpanded,
      expandAndScrollIntoView,
    ]
  );

  const onClickExpandCollapseButton = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      expandAndScrollIntoView();
    }
  }, [isExpanded, expandAndScrollIntoView]);

  //// Rendering ////

  const toggleId = `toggle-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;
  const collapseHeight = isExpanded ? contentHeight + "px" : "0";
  // Disable transition on initial rendering so the collapse does not animate
  const heightTransitionDuration = isInitialRender ? "0ms" : `${ANIMATION_DURATION_MS}ms`;

  return (
    <FlexColumn>
      <FlexRowAlignCenter style={{ justifyContent: "space-between" }}>
        <FlexRowAlignCenter $gap={6}>
          <FlexRowAlignCenter $gap={6}>
            {props.toggleChecked ? (
              <label htmlFor={toggleId} style={{ ...defaultProps.labelStyle, ...props.labelStyle }}>
                {props.label}
              </label>
            ) : (
              <span style={{ ...defaultProps.labelStyle, ...props.labelStyle }}>{props.label}</span>
            )}
            {props.toggleChecked !== undefined && (
              <Switch
                id={toggleId}
                checked={props.toggleChecked}
                onChange={onCheckboxChanged}
                disabled={props.toggleDisabled}
                // Align with default label text
                style={{ paddingTop: "2px" }}
              />
            )}
          </FlexRowAlignCenter>
          {props.headerContent}
        </FlexRowAlignCenter>

        <TextButton onClick={onClickExpandCollapseButton} style={{ padding: "0 5px" }}>
          <span style={{ fontSize: theme.font.size.label }}>
            {isExpanded ? <CaretUpFilled /> : <CaretDownFilled />}
          </span>
          <VisuallyHidden>
            {isExpanded ? "Collapse" : "Expand"} {props.label.toLowerCase() + " settings section"}
          </VisuallyHidden>
        </TextButton>
      </FlexRowAlignCenter>
      <div
        style={{
          marginLeft: `${props.contentIndentPx}px`,
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
