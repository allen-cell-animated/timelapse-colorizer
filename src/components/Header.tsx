import React, { PropsWithChildren, ReactElement } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { AicsLogoAndNameSVG, AicsLogoSVG } from "../assets";
import { FlexRowAlignCenter } from "../styles/utils";

const AICS_LOGO_RESIZE_THRESHOLD_PX = 540;

const AicsLogoLink = styled.a`
  position: relative;
  width: 180px;
  height: 46px;

  div > svg:last-child {
    display: none;
  }

  // Toggle between the two logos based on the currently available screen real estate
  // Width is determined here experimentally to prevent popping as the other buttons in the header wrap.
  @media only screen and (max-width: ${AICS_LOGO_RESIZE_THRESHOLD_PX}px) {
    & {
      max-width: 30px;
      max-height: 30px;
    }

    & > div > svg:first-child {
      display: none;
    }

    & > div > svg:last-child {
      display: block;
      visibility: visible;
    }
  }
`;

const VerticalDivider = styled.div`
  height: 24px;
  width: 1px;
  background-color: var(--color-dividers);
  display: inline-block;
  margin: 0 20px;

  @media only screen and (max-width: ${AICS_LOGO_RESIZE_THRESHOLD_PX}px) {
    margin: 0 10px;
  }
`;

/**
 * The logo and title of the app, to be used with the Header component.
 * Both the logo and app title are links that can be used for navigation.
 */
function HeaderLogo(): ReactElement {
  return (
    <FlexRowAlignCenter $gap={20}>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer" target="_blank">
        <div title={"https://www.allencell.org"}>
          <AicsLogoAndNameSVG />
          <AicsLogoSVG />
        </div>
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
  z-index: 2000;
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
