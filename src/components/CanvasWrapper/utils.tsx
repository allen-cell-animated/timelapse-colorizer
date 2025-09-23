import React, { ReactNode } from "react";

import { AppTheme } from "../AppStyle";
import { LinkStyleButton } from "../Buttons/LinkStyleButton";

export function makeLinkStyleButton(theme: AppTheme, key: string, onClick: () => void, content: ReactNode): ReactNode {
  return (
    <LinkStyleButton
      key={key}
      onClick={onClick}
      $color={theme.color.text.darkLink}
      $hoverColor={theme.color.text.darkLinkHover}
      tabIndex={-1}
    >
      {content}
    </LinkStyleButton>
  );
}
