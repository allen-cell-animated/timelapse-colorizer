import { Progress } from "antd";
import Tooltip from "antd/es/tooltip";
import React, { ReactElement, useContext } from "react";

import { TOOLTIP_TRIGGER } from "../../constants";

import { AppThemeContext } from "../AppStyle";

type StyledInlineProgressProps = {
  percent: number;
  error?: boolean;
  sizePx?: number;
};

const defaultProps: Partial<StyledInlineProgressProps> = {
  error: false,
};

export default function StyledInlineProgress(inputProps: StyledInlineProgressProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const theme = useContext(AppThemeContext);

  let progressBarColor = theme.color.theme;
  if (props.error) {
    progressBarColor = theme.color.text.error;
  } else if (props.percent === 100) {
    progressBarColor = theme.color.text.success;
  }

  return (
    <Tooltip title={props.percent + "%"} style={{ verticalAlign: "middle" }} trigger={TOOLTIP_TRIGGER}>
      <Progress
        style={{ marginRight: "8px", verticalAlign: "middle" }}
        type="circle"
        size={props.sizePx ?? theme.controls.heightSmall - 6}
        percent={props.percent}
        showInfo={false}
        strokeColor={progressBarColor}
        strokeWidth={12}
      />
    </Tooltip>
  );
}
