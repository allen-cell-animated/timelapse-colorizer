import React, { PropsWithChildren, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

type HoverTooltipProps = {
  tooltipContent?: ReactNode;
  disabled?: boolean;
  offsetPx?: [number, number];
};
const defaultProps: Partial<HoverTooltipProps> = {
  tooltipContent: <p>Tooltip</p>,
  disabled: false,
  offsetPx: [15, 15],
};

const TooltipDiv = styled.div`
  position: fixed;
  border-radius: var(--radius-control-small);
  border: 1px solid var(--color-dividers);
  background-color: var(--color-background);
  padding: 6px 8px;
  transition: opacity 300ms;
  z-index: 1;
`;

export default function HoverTooltip(props: PropsWithChildren<HoverTooltipProps>): ReactElement {
  props = { ...defaultProps, ...props } as PropsWithChildren<Required<HoverTooltipProps>>;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [relativeMousePosition, setRelativeMousePosition] = useState<[number, number]>([0, 0]);

  // Add a listener for mouse events
  useEffect(() => {
    const onMouseOver = (_event: MouseEvent): void => setIsHovered(true);
    const onMouseOut = (_event: MouseEvent): void => setIsHovered(false);
    const onMouseMove = (event: MouseEvent): void => {
      if (isHovered) {
        setRelativeMousePosition([event.clientX, event.clientY]);
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
  }, [containerRef.current, isHovered]);

  const visible = isHovered && !props.disabled && props.tooltipContent;

  return (
    <div ref={containerRef}>
      <TooltipDiv
        style={{
          left: `calc(${relativeMousePosition[0]}px + ${props.offsetPx![0]}px)`,
          top: `calc(${relativeMousePosition[1]}px + ${props.offsetPx![1]}px)`,
          opacity: visible ? 1 : 0,
        }}
      >
        {props.tooltipContent}
      </TooltipDiv>
      {props.children}
    </div>
  );
}
