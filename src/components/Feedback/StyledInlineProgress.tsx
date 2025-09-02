import { Progress } from "antd";
import Tooltip from "antd/es/tooltip";
import React, { ReactElement, useContext, useRef } from "react";

import { TOOLTIP_TRIGGER } from "../../constants";

import { AppThemeContext } from "../AppStyle";

type StyledInlineProgressProps = {
  /** A `[0, 100]` integer percentage. */
  percent: number;
  error?: boolean;
};

const defaultProps: Partial<StyledInlineProgressProps> = {
  error: false,
};

/**
 * A small, circular Progress indicator intended to be used inline. Also
 * includes error styling and a tooltip showing the current percentage of
 * completion.
 */
export default function StyledInlineProgress(inputProps: StyledInlineProgressProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const theme = useContext(AppThemeContext);
  const tooltipContainerRef = useRef<HTMLDivElement>(null);

  let progressBarColor = theme.color.theme;
  if (props.error) {
    progressBarColor = theme.color.text.error;
  } else if (props.percent >= 100) {
    progressBarColor = theme.color.text.success;
  }

  return (
    <div ref={tooltipContainerRef}>
      <Tooltip
        title={props.percent + "%"}
        style={{ verticalAlign: "middle" }}
        trigger={TOOLTIP_TRIGGER}
        // Fixes bug when Tooltip is rendered inside of a Modal or Popover
        getTooltipContainer={() => tooltipContainerRef.current!}
      >
        <Progress
          style={{ verticalAlign: "middle" }}
          type="circle"
          size={theme.controls.heightSmall - 6}
          percent={props.percent}
          showInfo={false}
          strokeColor={progressBarColor}
          strokeWidth={12}
        />
      </Tooltip>
    </div>
  );
}
