import { Tooltip, type TooltipProps } from "antd";
import React, { type ReactElement, type ReactNode, useContext } from "react";

import { AppThemeContext } from "src/styles/AppStyle";

type TooltipWithSubtitleProps = TooltipProps & {
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleList?: ReactNode[];
  tooltipRef?: React.RefObject<HTMLDivElement>;
};

/**
 * A wrapper around the Ant Design Tooltip that adds support for a subtitle (or
 * list of subtitles) beneath the main tooltip text.
 */
export function TooltipWithSubtitle(props: TooltipWithSubtitleProps): ReactElement {
  const theme = useContext(AppThemeContext);

  return (
    <Tooltip
      {...props}
      trigger={["hover", "focus"]}
      title={
        <div ref={props.tooltipRef}>
          <p style={{ margin: 0 }}>{props.title}</p>
          {props.subtitle && <p style={{ margin: 0, fontSize: theme.font.size.labelSmall }}>{props.subtitle}</p>}
          {props.subtitleList &&
            props.subtitleList.map((text, i) => (
              <p key={i} style={{ margin: 0, fontSize: theme.font.size.labelSmall }}>
                {text}
              </p>
            ))}
        </div>
      }
    >
      {props.children}
    </Tooltip>
  );
}
