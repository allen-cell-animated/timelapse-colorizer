import React, { PropsWithChildren, ReactElement, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { ScrollShadowContainer, useScrollShadow } from "../colorizer/utils/react_utils";
import { FlexColumn } from "../styles/utils";

import TextButton from "./Buttons/TextButton";

type ExpandableListProps = {
  expandActionText?: string;
  collapseActionText?: string;
  collapsedHeightPx?: number;
  expandedMaxHeightPx?: number;
  buttonStyle?: React.CSSProperties;
};
const defaultProps: Partial<ExpandableListProps> = {
  expandActionText: "Show more",
  collapseActionText: "Show less",
  collapsedHeightPx: 100,
  expandedMaxHeightPx: 500,
  buttonStyle: {},
};

const ExpandingContainer = styled.div<{
  $expanded: boolean;
  $showScrollbar: boolean;
  $collapsedHeightPx: number;
  $expandedMaxHeightPx: number;
}>`
  width: 100%;
  max-height: ${(props) => (props.$expanded ? props.$expandedMaxHeightPx : props.$collapsedHeightPx)}px;
  overflow-y: ${(props) => (props.$showScrollbar ? "auto" : "hidden")};
  transition: all 0.3s ease-in-out allow-discrete;
`;

/**
 * Expandable list area with configurable collapsed and expanded heights.
 *
 * Shows an optional expand/collapse button if the content is larger than the
 * collapsed height, and adds a scrollbar + scroll shadows if it exceeds
 * the max expanded height.
 */
export default function ExpandableList(inputProps: PropsWithChildren<ExpandableListProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<ExpandableListProps>>;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  const [expanded, setExpanded] = useState(false);
  const [contentSize, setContentSize] = useState(props.expandedMaxHeightPx);
  const childContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = (): void => {
      if (childContainerRef.current) {
        setContentSize(childContainerRef.current.scrollHeight);
      }
    };
    if (childContainerRef.current) {
      setContentSize(childContainerRef.current.scrollHeight);
    }
    childContainerRef.current?.addEventListener("resize", handleResize);
    return () => {
      childContainerRef.current?.removeEventListener("resize", handleResize);
    };
  }, [props.children, childContainerRef.current]);

  useEffect(() => {
    // Scroll to top when collapsing.
    if (!expanded) {
      scrollRef.current?.scrollTo(0, 0);
    }
  }, [expanded]);

  const showExpandButton = contentSize > props.collapsedHeightPx;
  const showScrollbar = expanded && contentSize > props.expandedMaxHeightPx;

  return (
    <FlexColumn>
      <div style={{ position: "relative" }}>
        <ExpandingContainer
          $expanded={expanded}
          $collapsedHeightPx={props.collapsedHeightPx}
          $expandedMaxHeightPx={props.expandedMaxHeightPx}
          $showScrollbar={showScrollbar}
          ref={scrollRef}
          onScroll={onScrollHandler}
        >
          <div ref={childContainerRef}>{props.children}</div>
        </ExpandingContainer>
        {showScrollbar && (
          <ScrollShadowContainer
            style={{
              ...scrollShadowStyle,
            }}
          />
        )}
      </div>
      {showExpandButton && (
        <div>
          <TextButton
            type="link"
            onClick={() => setExpanded(!expanded)}
            style={{ paddingLeft: "0px", ...props.buttonStyle }}
          >
            {expanded ? props.collapseActionText : props.expandActionText}
          </TextButton>
        </div>
      )}
    </FlexColumn>
  );
}
