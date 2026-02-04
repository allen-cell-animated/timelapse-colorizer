import React, { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

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
  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);

  // Debounce focus state, because focusout and focusin events can fire one
  // after the other.
  const [isFocusedInTooltip, setIsFocusedInTooltip] = useState(false);
  const isFocusedInTooltipDebounced = useDebounce(isFocusedInTooltip, 10);

  const tooltipTitle = (props.visible ? "Hide" : "Show") + " " + props.label;

  useEffect(() => {
    const onPointerEnter = (): void => setIsHoveringTooltip(true);
    const onPointerLeave = (): void => setIsHoveringTooltip(false);
    const onFocusIn = (): void => setIsFocusedInTooltip(true);
    const onFocusOut = (): void => setIsFocusedInTooltip(false);
    const tooltipDiv = tooltipRef.current;
    if (tooltipDiv) {
      tooltipDiv.addEventListener("pointerenter", onPointerEnter);
      tooltipDiv.addEventListener("pointerleave", onPointerLeave);
      tooltipDiv.addEventListener("focusin", onFocusIn);
      tooltipDiv.addEventListener("focusout", onFocusOut);
    }
    return () => {
      if (tooltipDiv) {
        tooltipDiv.removeEventListener("pointerenter", onPointerEnter);
        tooltipDiv.removeEventListener("pointerleave", onPointerLeave);
        tooltipDiv.removeEventListener("focusin", onFocusIn);
        tooltipDiv.removeEventListener("focusout", onFocusOut);
      }
    };
  }, [tooltipRef.current]);

  const onOpenChange = (open: boolean): void => {
    // Fix a bug where, if the tooltip is open because the inner button is
    // focused (e.g. a user clicked it), clicking on the tooltip's contents
    // would cause the button to lose focus and instantly close the tooltip.
    // Instead, we want the tooltip to stay open if the user while the user is
    // hovering or focused in the tooltip.
    if (!isHoveringTooltip) {
      setTooltipOpen(open);
    }
  };

  return (
    <div ref={tooltipContainerRef}>
      <TooltipWithSubtitle
        title={tooltipTitle}
        placement="right"
        subtitleList={props.tooltipContents}
        trigger={["hover", "focus"]}
        onOpenChange={onOpenChange}
        open={tooltipOpen || isFocusedInTooltipDebounced}
        tooltipRef={tooltipRef}
        getPopupContainer={() => tooltipContainerRef.current || document.body}
      >
        <IconButton
          type={props.visible && !props.disabled ? "primary" : "link"}
          onClick={() => props.setVisible(!props.visible)}
          disabled={props.disabled}
        >
          {props.visible ? <ImagesIconSVG /> : <ImagesSlashIconSVG />}
          <VisuallyHidden>{tooltipTitle}</VisuallyHidden>
        </IconButton>
      </TooltipWithSubtitle>
    </div>
  );
}
