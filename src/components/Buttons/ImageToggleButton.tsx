import React, { ReactElement, ReactNode, useEffect, useState } from "react";

import { ImagesIconSVG, ImagesSlashIconSVG } from "../../assets";
import { VisuallyHidden } from "../../styles/utils";

import IconButton from "../IconButton";
import { TooltipWithSubtitle } from "../Tooltips/TooltipWithSubtitle";

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
  const divRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);

  const tooltipTitle = (props.visible ? "Hide" : "Show") + " " + props.label;

  useEffect(() => {
    const onPointerEnter = () => setIsHoveringTooltip(true);
    const onPointerLeave = () => setIsHoveringTooltip(false);
    const tooltipDiv = tooltipRef.current;
    if (tooltipDiv) {
      tooltipDiv.addEventListener("pointerenter", onPointerEnter);
      tooltipDiv.addEventListener("pointerleave", onPointerLeave);
    }
    return () => {
      if (tooltipDiv) {
        tooltipDiv.removeEventListener("pointerenter", onPointerEnter);
        tooltipDiv.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [tooltipRef.current]);

  const onOpenChange = (open: boolean) => {
    // Fix a bug where, if the tooltip is open because the inner button is
    // focused (e.g. a user clicked it), clicking on the tooltip's contents
    // would cause the button to lose focus and instantly close the tooltip.
    // Instead, we want the tooltip to stay open if the user while the user is
    // hovering.
    if (!isHoveringTooltip) {
      setTooltipOpen(open);
    }
  };

  return (
    <div ref={divRef}>
      <TooltipWithSubtitle
        title={tooltipTitle}
        placement="right"
        subtitleList={props.tooltipContents}
        trigger={["hover", "focus"]}
        getPopupContainer={() => divRef.current || document.body}
        onOpenChange={onOpenChange}
        open={tooltipOpen}
        tooltipRef={tooltipRef}
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
    </div>
  );
}
