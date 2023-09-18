import React, { PropsWithChildren, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

// import styles from "./HoverTooltip.module.css";

type HoverTooltipProps = {
  tooltipContent?: ReactNode;
  visible?: boolean;
  disabled?: boolean;
  offsetPx?: [number, number];
};
const defaultProps: Partial<HoverTooltipProps> = {
  tooltipContent: <></>,
  visible: true,
  disabled: false,
  offsetPx: [10, 10],
};

const TooltipDiv = styled.div`
  position: fixed;
  border-radius: var(--radius-control-small);
  border: 1px solid var(--color-dividers);
  background-color: var(--color-background);
  padding: 6px 8px;
`;

export default function HoverTooltip(props: PropsWithChildren<HoverTooltipProps>): ReactElement {
  props = { ...defaultProps, ...props } as PropsWithChildren<Required<HoverTooltipProps>>;

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [relativeMousePosition, setRelativeMousePosition] = useState<[number, number]>([0, 0]);

  // Add a listener for mouse events
  useEffect(() => {
    const onMouseOver = (_event: MouseEvent) => setIsHovered(true);
    const onMouseOut = (_event: MouseEvent) => setIsHovered(false);
    const onMouseMove = (event: MouseEvent) => setRelativeMousePosition([event.pageX, event.pageY]);

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
  }, [containerRef.current]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <TooltipDiv
        style={{
          left: `calc(${relativeMousePosition[0]}px + ${props.offsetPx![0]}px)`,
          top: `calc(${relativeMousePosition[1]}px + ${props.offsetPx![1]}px)`,
          visibility: isHovered ? "visible" : "hidden",
        }}
        ref={tooltipRef}
      >
        <p>Line 1</p>
        <p>Line 2</p>
        {props.tooltipContent}
      </TooltipDiv>
      {props.children}
    </div>
  );
}
