import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

import { ScrollShadowContainer, useScrollShadow } from "../../colorizer/utils/react_utils";

type DropdownItemListProps = {
  maxHeightPx?: number;
};
const defaultProps: Partial<DropdownItemListProps> = {
  maxHeightPx: 300,
};

const MainContainer = styled.div`
  position: relative;
  overflow: auto;
  width: auto;
`;

/** Convenience styled div for alignment and spacing of dropdown items. */
const DropdownItemContainer = styled.div`
  display: block;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  height: 100%;
`;

export default function DropdownItemList(inputProps: PropsWithChildren<DropdownItemListProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<DropdownItemListProps>>;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  return (
    <MainContainer style={{ maxHeight: props.maxHeightPx }}>
      <DropdownItemContainer onScroll={onScrollHandler} ref={scrollRef}>
        {props.children}
      </DropdownItemContainer>
      <ScrollShadowContainer style={{ ...scrollShadowStyle }} />
    </MainContainer>
  );
}
