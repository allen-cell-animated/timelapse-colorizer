import React, { ReactElement } from "react";
import styled from "styled-components";

import { AicsLogoSVG } from "../../assets";
import { FlexRowAlignCenter } from "../../styles/utils";

const AicsLogoLink = styled.a`
  position: relative;
  width: 180px;
  height: 46px;
`;

const StyledAicsLogo = styled(AicsLogoSVG)`
  left: 0;
  top: 0;
  position: absolute;
`;

const VerticalDivider = styled.div`
  height: 24px;
  width: 1px;
  background-color: var(--color-dividers);
  display: inline-block;
`;

/** Top title bar for the app */
export const AppHeader = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  width: auto;
  height: fit-content;
  min-height: var(--header-content-height);
  padding: 12px 30px;
  border-bottom: 1px solid var(--color-borders);
  gap: 10px;
  position: sticky;
  background-color: var(--color-background);
  z-index: 100;
  top: 0;
  left: 0;
`;

export function HeaderLogo(): ReactElement {
  return (
    <FlexRowAlignCenter $gap={20}>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer">
        <StyledAicsLogo title={"https://www.allencell.org"} />
      </AicsLogoLink>
      <VerticalDivider />
      <h1 style={{ whiteSpace: "nowrap" }}>Timelapse Colorizer</h1>{" "}
    </FlexRowAlignCenter>
  );
}
