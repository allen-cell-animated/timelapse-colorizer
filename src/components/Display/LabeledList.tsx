import { Card } from "antd";
import React, { type PropsWithChildren, type ReactElement } from "react";
import styled from "styled-components";

import { FlexColumn } from "src/styles/utils";
import { insertBetweenElements } from "src/utils/formatting";

const ListCard = styled(Card)`
  --padding-y: 6px;
  --padding-x-start: 10px;
  --padding-x-end: 6px;
  --total-padding-x: calc(var(--padding-x-start) + var(--padding-x-end));
  background-color: var(--color-viewport-overlay-background);

  & .ant-card-head {
    padding: var(--padding-y) var(--padding-x-end) var(--padding-y) var(--padding-x-start);
    background-color: var(--color-background-alt-transparent);
  }

  & .ant-card-body {
    padding: var(--padding-y) var(--padding-x-end) var(--padding-y) var(--padding-x-start);

    & > div > hr {
      width: calc(100% + var(--total-padding-x));
      height: 1px;
      margin: 0 calc(-1 * var(--padding-x-start));
      border-style: none;
      background-color: var(--color-dividers);
    }
  }
`;

type LabeledListProps = {
  title?: string;
};
const defaultProps: Partial<LabeledListProps> = {};

/**
 * Styled card component that displays a list of items under a header. Items are
 * separated by a horizontal rule.
 */
export default function LabeledList(inputProps: PropsWithChildren<LabeledListProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LabeledListProps>>;
  return (
    <ListCard title={props.title} size="small">
      <FlexColumn $gap={6}>{props.children && insertBetweenElements(props.children, <hr />)}</FlexColumn>
    </ListCard>
  );
}
