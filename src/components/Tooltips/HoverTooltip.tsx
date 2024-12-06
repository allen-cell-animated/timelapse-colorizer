import React, { PropsWithChildren, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

type HoverTooltipProps = {
  /** Content to show in the Tooltip box. */
  tooltipContent?: ReactNode;
  /** If disabled is true, tooltip will be hidden. */
  disabled?: boolean;
  /** Offset of the tooltip box relative to the mouse, in pixels. By default, set to 15 pixels in x and y. */
  offsetPx?: [number, number];
  maxWidthPx?: number;
};

const defaultProps: Partial<HoverTooltipProps> = {
  tooltipContent: <p>Tooltip</p>,
  disabled: false,
  offsetPx: [15, 15],
  maxWidthPx: 250,
};

const TooltipDiv = styled.div`
  position: fixed;
  transition: opacity 300ms ease-in-out;
  z-index: 1;
`;

/**
 * Adds a tooltip region around the provided child. A tooltip will appear next to the mouse when
 * the mouse enters the area, and disappear on exit.
 */
export default function HoverTooltip(props: PropsWithChildren<HoverTooltipProps>): ReactElement {
  props = { ...defaultProps, ...props } as PropsWithChildren<Required<HoverTooltipProps>>;

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Add a listener for mouse events
  useEffect(() => {
    const onMouseOver = (_event: MouseEvent): void => setIsHovered(true);
    const onMouseOut = (_event: MouseEvent): void => setIsHovered(false);
    const onMouseMove = (event: MouseEvent): void => {
      // Use last position on the screen
      // setRelativeMousePosition([event.clientX, event.clientY]);
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `calc(${event.clientX}px + ${props.offsetPx![0]}px)`;
        tooltipRef.current.style.top = `calc(${event.clientY}px + ${props.offsetPx![0]}px)`;
      }
    };

    if (containerRef.current) {
      const ref = containerRef.current;
      ref.addEventListener("mouseover", onMouseOver);
      ref.addEventListener("mouseout", onMouseOut);
      ref.addEventListener("mousemove", onMouseMove);
      return () => {
        // Cleanup
        ref.removeEventListener("mouseover", onMouseOver);
        ref.removeEventListener("mouseout", onMouseOut);
        ref.removeEventListener("mousemove", onMouseMove);
      };
    }
    return;
  }, [containerRef.current, isHovered, props.disabled, props.tooltipContent]);

  const visible = isHovered && !props.disabled && props.tooltipContent;

  return (
    <div ref={containerRef}>
      <TooltipDiv ref={tooltipRef} style={{ opacity: visible ? 1 : 0, maxWidth: `${props.maxWidthPx}px` }}>
        {props.tooltipContent}
      </TooltipDiv>
      {props.children}
    </div>
  );
}
