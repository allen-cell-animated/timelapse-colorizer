import type React from "react";
import {type EventHandler} from "react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { useConstructor } from "./useConstructor";

/**
 * Convenience styled component for use with `useScrollShadow`, intended to
 * display the edge shadows. Place this inside the parent component as a sibling
 * to the scrolling area, and apply the `scrollShadowStyle` to it.
 */
export const ScrollShadowContainer = styled.div`
  position: absolute;
  pointer-events: none;
  // Fill the parent completely so we can overlay the
  // shadow effects above the content.
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: box-shadow 0.1s ease-in;
`;

/**
 * Hook for adding scroll shadows to an element.
 *
 * Adapted from a solution by Marius Ibsen at
 * https://medium.com/dfind-consulting/react-scroll-hook-with-shadows-9ba2d47ae32.
 * Added typing and fixed a bug where shadows would not appear before users
 * interacted with the element, and another where shadows would not disappear
 * when the element was not scrollable.
 *
 * @param shadowColor a CSS color string for shadows. Set to "#00000030" by
 * default.
 * @returns an object with three properties:
 * - `scrollShadowStyle`: a CSSProperties object that can be applied to the
 *   element to add a shadow. NOTE: This does not have to be the scrolling
 *   element; see the example for an overlay shadow.
 * - `onScrollHandler`: an event handler to assign as the scrolling element's
 *   `onScroll` event.
 * - `scrollRef`: a ref to attach to the scrolling element.
 *
 * @example
 * ```
 * import { useScrollShadow, ScrollShadowContainer } from "colorizer/utils/react_utils";
 *
 * function MyComponent() {
 *   const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
 *
 *   return (
 *     <div style={{position: "relative"}}>
 *       <div
 *         ref={scrollRef}
 *         onScroll={onScrollHandler}
 *         style={{overflow-y: "auto", height: "50px"}}
 *       >
 *         <p>Some content</p>
 *         <p>Some more content</p>
 *         <p>Some more content</p>
 *       </div>
 *       <ScrollShadowContainer style={{
 *         ...scrollShadowStyle
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollShadow(shadowColor: string = "#00000030"): {
  scrollShadowStyle: React.CSSProperties;
  onScrollHandler: EventHandler<any>;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
} {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const updateScrollInfo = (div: HTMLDivElement | null): void => {
    if (!div) {
      return;
    }
    setScrollTop(div.scrollTop);
    setScrollHeight(div.scrollHeight);
    setClientHeight(div.clientHeight);
  };

  const mutationObserver = useConstructor(
    () =>
      new MutationObserver(() => {
        if (scrollRef.current) {
          updateScrollInfo(scrollRef.current);
        }
      })
  ).current;

  const onScrollHandler: EventHandler<any> = (event) => {
    updateScrollInfo(event.target);
  };

  // Update shadows before first interaction
  useEffect(() => {
    if (scrollRef.current) {
      updateScrollInfo(scrollRef.current);
      mutationObserver.observe(scrollRef.current, {
        childList: true,
        subtree: true,
      });
      return () => {
        mutationObserver.disconnect();
      };
    }
    return;
  }, [scrollRef.current, mutationObserver]);

  function getBoxShadow(): string {
    const scrolledToBottom = clientHeight === scrollHeight - scrollTop;
    const scrolledToTop = scrollTop === 0;
    const scrolledBetween = scrollTop > 0 && clientHeight < scrollHeight - scrollTop;

    const showBottom = (scrolledToTop && !scrolledToBottom) || scrolledBetween;
    const showTop = (scrolledToBottom && !scrolledToTop) || scrolledBetween;
    const topShadowOffset = showTop ? "8px" : "0px";
    const bottomShadowOffset = showBottom ? "-8px" : "0px";

    const top = `inset 0 ${topShadowOffset} 5px -5px ${shadowColor}`;
    const bottom = `inset 0 ${bottomShadowOffset} 5px -5px ${shadowColor}`;
    return `${top}, ${bottom}`;
  }

  return { scrollShadowStyle: { boxShadow: getBoxShadow() }, onScrollHandler, scrollRef };
}
