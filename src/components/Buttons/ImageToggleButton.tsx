import React, { type ReactElement, type ReactNode } from "react";

import { ImagesIconSVG, ImagesSlashIconSVG } from "src/assets";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import { VisuallyHidden } from "src/styles/utils";

import IconButton from "./IconButton";

export type ToggleImageButtonProps = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  disabled: boolean;
  label: string;
  tooltipContents: ReactNode[];
};

/**
 * Icon button that toggles an image layer (e.g. 3D channels or 2D backdrop
 * images), as a reusable component.
 */
export function ImageToggleButton(props: ToggleImageButtonProps): ReactElement {
  const tooltipTitle = (props.visible ? "Hide" : "Show") + " " + props.label;
  return (
    <TooltipWithSubtitle
      title={tooltipTitle}
      placement="right"
      subtitleList={props.tooltipContents}
      trigger={["hover", "focus"]}
    >
      <IconButton
        type={props.visible && !props.disabled ? "primary" : "link"}
        onClick={() => props.setVisible(!props.visible)}
        disabled={props.disabled}
      >
        {props.visible ? <ImagesSlashIconSVG /> : <ImagesIconSVG />}
        <VisuallyHidden>{tooltipTitle}</VisuallyHidden>
      </IconButton>
    </TooltipWithSubtitle>
  );
}
