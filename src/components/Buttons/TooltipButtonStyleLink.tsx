import React, { type ReactElement, useContext } from "react";

import { AppThemeContext } from "src/styles/AppStyle";

import { LinkStyleButton } from "./LinkStyleButton";

/** A button styled like a link that can be used for in-tooltip navigation. */
export default function TooltipButtonStyleLink(props: React.ComponentProps<typeof LinkStyleButton>): ReactElement {
  const theme = useContext(AppThemeContext);

  return (
    <LinkStyleButton {...props} $color={theme.color.text.darkLink} $hoverColor={theme.color.text.darkLinkHover}>
      {props.children}
    </LinkStyleButton>
  );
}
