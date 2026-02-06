import React, { type ReactElement } from "react";
import styled from "styled-components";

type ValueListItemProps = {
  value: string;
  numTracks: number;
  style: React.CSSProperties;
};

const TextContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 5px;

  & p {
    padding-bottom: 0;
    margin-bottom: -1px;
  }
`;

const VerticalDivider = styled.div`
  height: 20px;
  width: 1px;
  background-color: var(--color-dividers);
`;

/** A value label and its track count, renderable as an item in a list. */
export default function ValueListItem(props: ValueListItemProps): ReactElement {
  return (
    <TextContainer style={props.style}>
      <p style={{ minWidth: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <b>{props.value}</b>
      </p>
      <VerticalDivider />
      <p style={{ whiteSpace: "nowrap" }}>
        {props.numTracks} track{props.numTracks > 1 ? "s" : ""}
      </p>
    </TextContainer>
  );
}
