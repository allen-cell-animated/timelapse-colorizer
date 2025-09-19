import { CaretDownFilled, CaretUpFilled } from "@ant-design/icons";
import { Switch } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { FlexColumn, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";
import TextButton from "./Buttons/TextButton";

const ANIMATION_DURATION_MS = 150;

type ToggleCollapseProps = {
  className?: string;
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
  /**
   * The max height of the inner content of the collapse, used for animations.
   * By default, this is 2000; increase this if your content is larger and
   * appears partially clipped.
   */
  maxContentHeightPx?: number;
};

const defaultProps: Partial<ToggleCollapseProps> = {
  labelStyle: {
    fontSize: "var(--font-size-label)",
  },
  headerContent: null,
  scrollIntoViewOnChecked: true,
  contentIndentPx: 40,
  maxContentHeightPx: 2000,
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
  const [isAnimating, setIsAnimating] = useState(false);
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  const startAnimating = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  // Sync expanded state with toggle state
  useEffect(() => {
    if (props.toggleChecked !== undefined) {
      setIsExpanded(props.toggleChecked);
    }
  }, [props.toggleChecked]);

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
      startAnimating();
      if (props.onToggleChange) {
        props.onToggleChange(checked);
      }
      if (!isExpanded && checked && props.scrollIntoViewOnChecked && contentContainerRef.current) {
        expandAndScrollIntoView();
      }
    },
    [props.onToggleChange, props.scrollIntoViewOnChecked, props.toggleChecked, isExpanded, expandAndScrollIntoView]
  );

  const onClickExpandCollapseButton = useCallback(() => {
    startAnimating();
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      expandAndScrollIntoView();
    }
  }, [isExpanded, expandAndScrollIntoView]);

  //// Rendering ////

  const toggleId = `toggle-collapse-${props.label.replace(/\s+/g, "-").toLowerCase()}`;
  // Disable transition on initial rendering so the collapse does not animate
  const heightTransitionDuration = isAnimating ? `${ANIMATION_DURATION_MS}ms` : "0ms";
  const showOverflow = isExpanded && !isAnimating;

  return (
    <FlexColumn className={"toggle-collapse " + props.className}>
      <FlexRowAlignCenter className={"toggle-collapse-control-row"} style={{ justifyContent: "space-between" }}>
        <FlexRowAlignCenter $gap={6} className={"toggle-collapse-header"}>
          {!props.toggleDisabled ? (
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
        // This combines two different tricks. The container should animate the
        // expand or collapse, but when not animating, we want the container to
        // size automatically to fit child components without a delay/animation.
        //
        // "height: auto" is not an animatable property, but we can animate on
        // grid row sizing (1fr vs 0fr). However, the inner div does not
        // actually collapse at 0fr because 0fr respects intrinsic content
        // sizing, so we also have to animate the max-height of the inner div.
        style={{
          display: "grid",
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          marginLeft: `${props.contentIndentPx}px`,
          overflow: showOverflow ? "visible" : "hidden",
          transition: `grid-template-rows ${heightTransitionDuration} ease-in-out`,
        }}
      >
        <div
          style={{
            // TODO: This is a magic number, consider measuring the actual content height?
            maxHeight: isExpanded ? `${props.maxContentHeightPx}px` : "0px",
            overflow: "hidden",
            transition: `max-height ${heightTransitionDuration} ease-in-out`,
          }}
        >
          <div style={{ padding: "8px 0" }} ref={contentContainerRef}>
            {props.children}
          </div>
        </div>
      </div>
    </FlexColumn>
  );
}
