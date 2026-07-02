import { Tooltip, type TooltipProps } from "antd";
import type { TooltipRef } from "antd/es/tooltip";
import React, { forwardRef, type ReactElement, type ReactNode, useContext } from "react";

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
const TooltipWithSubtitle = forwardRef<TooltipRef, TooltipWithSubtitleProps>(function TooltipWithSubtitle(
  props: TooltipWithSubtitleProps,
  ref
): ReactElement {
  const theme = useContext(AppThemeContext);

  return (
    <Tooltip
      ref={ref}
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
});
export default TooltipWithSubtitle;
