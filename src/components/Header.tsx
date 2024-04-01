import React, { PropsWithChildren, ReactElement } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { AicsLogoSVG } from "../assets";
import { FlexRowAlignCenter } from "../styles/utils";

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

/**
 * The logo and title of the app, to be used with the Header component.
 * Both the logo and app title are links that can be used for navigation.
 */
function HeaderLogo(): ReactElement {
  return (
    <FlexRowAlignCenter $gap={20}>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer" target="_blank">
        <StyledAicsLogo title={"https://www.allencell.org"} />
      </AicsLogoLink>
      <VerticalDivider />
      <Link to="/" aria-label="Go to home page">
        <h1 style={{ whiteSpace: "nowrap" }}>Timelapse Feature Explorer</h1>
      </Link>
    </FlexRowAlignCenter>
  );
}

/**
 * Top title bar for the app, which will stick to the top of the page.
 * Child components will be spaced apart evenly.
 * */
const HeaderContainer = styled.div`
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

export default function Header(props: PropsWithChildren): ReactElement {
  return (
    <HeaderContainer>
      <HeaderLogo />
      {props.children}
    </HeaderContainer>
  );
}
