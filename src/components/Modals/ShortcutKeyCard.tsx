import { Card } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import ShortcutKeyText from "src/components/Modals/ShortcutKeyText";
import type { ShortcutKeyInfo } from "src/constants";
import { FlexColumn } from "src/styles/utils";
import { insertBetweenElements } from "src/utils/formatting";

const ListCard = styled(Card)`
  & .ant-card-head {
    background-color: var(--color-background-alt);
  }

  & .ant-card-body {
    --padding: 12px;
    padding: 6px var(--padding);

    & hr {
      width: calc(100% + 2 * var(--padding));
      height: 1px;
      margin: 0 calc(-1 * var(--padding));
      border-style: none;
      background-color: var(--color-dividers);
    }
  }
`;

type ShortcutKeyCardProps = {
  shortcutKeys: Record<string, ShortcutKeyInfo>;
  title: string;
};

export default function ShortcutKeyList(props: ShortcutKeyCardProps): ReactElement {
  const shortcutKeyElements = Object.values(props.shortcutKeys).map((shortcutKey) => (
    <ShortcutKeyText key={shortcutKey.name} shortcutKey={shortcutKey} />
  ));
  return (
    <ListCard title={props.title} size="small">
      <FlexColumn $gap={6}>{insertBetweenElements(shortcutKeyElements, <hr />)}</FlexColumn>
    </ListCard>
  );
}
