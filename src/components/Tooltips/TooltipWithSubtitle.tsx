import { Tooltip, TooltipProps } from "antd";
import React, { ReactElement, ReactNode, useRef } from "react";

/**
 * A wrapper around the Ant Design Tooltip that adds support for a subtitle (or
 * list of subtitles) beneath the main tooltip text.
 */
export function TooltipWithSubtitle(
  props: TooltipProps & { title: ReactNode; subtitle?: ReactNode; subtitleList?: ReactNode[] }
): ReactElement {
  const divRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={divRef}>
      <Tooltip
        {...props}
        trigger={["hover", "focus"]}
        title={
          <>
            <p style={{ margin: 0 }}>{props.title}</p>
            {props.subtitle && <p style={{ margin: 0, fontSize: "12px" }}>{props.subtitle}</p>}
            {props.subtitleList &&
              props.subtitleList.map((text, i) => (
                <p key={i} style={{ margin: 0, fontSize: "12px" }}>
                  {text}
                </p>
              ))}
          </>
        }
        getPopupContainer={() => divRef.current ?? document.body}
      >
        {props.children}
        {/* TODO: include invisible text here copying the tooltip */}
      </Tooltip>
    </div>
  );
}
