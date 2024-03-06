import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

import { AicsLogoSVG } from "../../assets";
import { FlexRowAlignCenter } from "../../styles/utils";

type AppHeaderProps = {};
const defaultProps: Partial<AppHeaderProps> = {};

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

export default function AppHeader(inputProps: PropsWithChildren<AppHeaderProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<AppHeaderProps>>;
  return <>{props.children}</>;
}

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
