import React, { ReactElement } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { AicsLogoSVG } from "../../assets";
import { FlexRowAlignCenter, VisuallyHidden } from "../../styles/utils";

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
 * The logo for the header, with links for the
 * @returns
 */
export default function HeaderLogo(): ReactElement {
  return (
    <FlexRowAlignCenter $gap={20}>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer" target="_blank">
        <StyledAicsLogo title={"https://www.allencell.org"} />
      </AicsLogoLink>
      <VerticalDivider />
      <Link to="/">
        <h1 style={{ whiteSpace: "nowrap" }}>Timelapse Colorizer</h1>
        <VisuallyHidden>(go to home page)</VisuallyHidden>
      </Link>
    </FlexRowAlignCenter>
  );
}
