import React, { PropsWithChildren, ReactElement, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { ScrollShadowContainer, useScrollShadow } from "../colorizer/utils/react_utils";
import { FlexColumn } from "../styles/utils";

import TextButton from "./Buttons/TextButton";

type ExpandableListProps = {
  expandActionText?: string;
  collapseActionText?: string;
  collapsedHeightPx?: number;
  expandedMaxHeightPx?: number;
};
const defaultProps: Partial<ExpandableListProps> = {
  expandActionText: "Show more",
  collapseActionText: "Show less",
  collapsedHeightPx: 100,
  expandedMaxHeightPx: 500,
};

const ExpandingContainer = styled.div<{ $expanded: boolean; $collapsedHeightPx: number; $expandedMaxHeightPx: number }>`
  width: 100%;
  max-height: ${(props) => (props.$expanded ? props.$expandedMaxHeightPx : props.$collapsedHeightPx)}px;

  transition: all 0.3s ease-in-out allow-discrete;
  overflow-y: ${(props) => (props.$expanded ? "auto" : "hidden")};
  /* overflow-y: clip;

  // When the container expands, animate in scrollbar after a delay so it
  // doesn't flash. (Note that when the container starts to collapse, the
  // scrollbar is removed immediately.)
  ${(props) => {
    if (props.$expanded) {
      return css`
        animation: showScroll 0s ease-in-out;
        animation-delay: 0.3s;
        animation-fill-mode: forwards;
      `;
    }
    return "";
  }}

  @keyframes showScroll {
    0% {
      overflow-y: clip;
    }
    100% {
      overflow-y: auto;
    }
  } */
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
        console.log("childContainerRef.current", childContainerRef.current);
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
    if (!expanded) {
      scrollRef.current?.scrollTo(0, 0);
    }
  }, [expanded]);

  const showExpandButton = contentSize > props.collapsedHeightPx;
  const showScrollShadow = expanded && contentSize > props.expandedMaxHeightPx;

  return (
    <FlexColumn>
      <div style={{ position: "relative" }}>
        <ExpandingContainer
          $expanded={expanded}
          $collapsedHeightPx={props.collapsedHeightPx}
          $expandedMaxHeightPx={props.expandedMaxHeightPx}
          ref={scrollRef}
          onScroll={onScrollHandler}
        >
          <div ref={childContainerRef}>{props.children}</div>
        </ExpandingContainer>
        {showScrollShadow && (
          <ScrollShadowContainer
            style={{
              ...scrollShadowStyle,
            }}
          />
        )}
      </div>
      {showExpandButton && (
        <div>
          <TextButton type="link" onClick={() => setExpanded(!expanded)} style={{ paddingLeft: "0px" }}>
            {expanded ? props.collapseActionText : props.expandActionText}
          </TextButton>
        </div>
      )}
    </FlexColumn>
  );
}
