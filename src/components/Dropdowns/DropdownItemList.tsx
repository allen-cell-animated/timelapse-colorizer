import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

import { ScrollShadowContainer, useScrollShadow } from "../../colorizer/utils/react_utils";
import { FlexColumn } from "../../styles/utils";

type DropdownItemListProps = {
  maxHeightPx?: number;
};
const defaultProps: Partial<DropdownItemListProps> = {
  maxHeightPx: 300,
};

const MainContainer = styled.div`
  position: relative;
  width: auto;
`;

/** Convenience styled div for alignment and spacing of dropdown items. */
const ScrollContainer = styled.div`
  overflow-y: auto;
`;

export default function DropdownItemList(inputProps: PropsWithChildren<DropdownItemListProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<DropdownItemListProps>>;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  return (
    <MainContainer>
      <ScrollContainer onScroll={onScrollHandler} ref={scrollRef} style={{ maxHeight: props.maxHeightPx }}>
        <FlexColumn $gap={4}>{props.children}</FlexColumn>
      </ScrollContainer>
      <ScrollShadowContainer style={{ ...scrollShadowStyle }} />
    </MainContainer>
  );
}
