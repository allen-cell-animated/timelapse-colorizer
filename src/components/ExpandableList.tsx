import React, { PropsWithChildren, ReactElement, useRef, useState } from "react";
import styled from "styled-components";

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
  overflow-y: ${(props) => (props.$expanded ? "scroll" : "hidden")};

  transition: 0.3s ease-in-out, overflow-y 0s ease 0.3s;
`;

export default function ExpandableList(inputProps: PropsWithChildren<ExpandableListProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<ExpandableListProps>>;

  const [expanded, setExpanded] = useState(false);
  const childContainerRef = useRef<HTMLDivElement>(null);

  return (
    <FlexColumn>
      <ExpandingContainer
        $expanded={expanded}
        $collapsedHeightPx={props.collapsedHeightPx}
        $expandedMaxHeightPx={props.expandedMaxHeightPx}
      >
        <div ref={childContainerRef}>{props.children}</div>
      </ExpandingContainer>
      <div>
        <TextButton type="link" onClick={() => setExpanded(!expanded)} style={{ paddingLeft: "0px" }}>
          {expanded ? props.collapseActionText : props.expandActionText}
        </TextButton>
      </div>
    </FlexColumn>
  );
}
