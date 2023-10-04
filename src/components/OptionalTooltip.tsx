import { Tooltip } from "antd";
import { TooltipPlacement } from "antd/es/tooltip";
import React, { PropsWithChildren, ReactElement } from "react";

type OptionalTooltipProps = {
  disabled?: boolean;
  title?: string;
  placement?: TooltipPlacement;
};

/**
 * Layout-safe optional tooltip. If disabled, directly returns the child without
 * wrapping it in a Tooltip.
 *
 * This component exists because disabling a tooltip in Ant causes unwanted
 * layout changes.
 */
export default function OptionalTooltip(props: PropsWithChildren<OptionalTooltipProps>): ReactElement {
  if (props.disabled) {
    return <>{props.children}</>;
  }

  return (
    <Tooltip title={props.title} placement={props.placement}>
      {props.children}
    </Tooltip>
  );
}
