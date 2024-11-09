import React, { EventHandler, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useLocalStorage } from "usehooks-ts";

import { VectorConfig } from "../types";

import Dataset from "../Dataset";
import SharedWorkerPool from "../workers/SharedWorkerPool";

/**
 * Delays changes to a value until no changes have occurred for the
 * set delay period, in milliseconds. This is useful for delaying changes to state
 * when a value may update very quickly.
 *
 * Adapted from https://usehooks-ts.com/react-hook/use-debounce.
 *
 * @param value The value to return.
 * @param delayMs The delay, in milliseconds.
 * @returns The `value` once no changes have occurred for `delay` milliseconds.
 * @example
 * ```
 * const [value, setValue] = useState(0);
 * const debouncedValue = useDebounce(value, 500);
 *
 * useEffect(() => {
 *  // Some expensive operation
 * }, [debouncedValue])
 *
 * return(
 *  <div>
 *      <p>{debouncedValue}</p>
 *  </div>
 * )
 * ```
 */
export function useDebounce<T>(value: T, delayMs?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Returns a reference to a constructed value that will not be re-computed between renders.
 *
 * Functionally, this is a wrapper around useRef and allows it to be used in a type-safe way.
 * See https://react.dev/reference/react/useRef for more details.
 *
 * @param constructor A callback used to assign the value. This will only be called once.
 * @returns The value as returned by the constructor.
 * @example
 * ```
 * const value = useConstructor(() => {return new ValueConstructor()});
 * ```
 */
export function useConstructor<T>(constructor: () => T): T {
  const value = useRef<T | null>(null);
  if (value.current === null) {
    value.current = constructor();
  }
  return value.current;
}

/** Returns a shallow copy of an object, excluding all entries where the value is undefined. */
export function excludeUndefinedValues<T extends Object>(obj: T): Partial<T> {
  const ret = {} as Partial<T>;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

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
 * Adapted with edits from https://medium.com/dfind-consulting/react-scroll-hook-with-shadows-9ba2d47ae32.
 * Added typing and fixed a bug where shadows would not appear before users interacted with the element, and
 * another where shadows would not disappear when the element was not scrollable.
 *
 * @param shadowColor a CSS-interpretable string representing a color.
 * @returns an object with three properties:
 * - `scrollShadowStyle`: a CSSProperties object that can be applied to the element to add a shadow. NOTE:
 * This does not have to be the scrolling element; see the example for an overlay shadow.
 * - `onScrollHandler`: an event handler to attach to the scrolling element's `onScroll` event.
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
 *   <div style={{position: "relative"}}>
 *     <div
 *       ref={scrollRef}
 *       onScroll={onScrollHandler}
 *       style={{overflow-y: "auto", height: "50px"}}
 *     >
 *       <p>Some content</p>
 *       <p>Some more content</p>
 *       <p>Some more content</p>
 *     </div>
 *     <ScrollShadowContainer style={{
 *       ...scrollShadowStyle
 *     }} />
 *   </div>
 * }
 * ```
 */
export function useScrollShadow(shadowColor: string = "#00000030"): {
  scrollShadowStyle: React.CSSProperties;
  onScrollHandler: EventHandler<any>;
  scrollRef: React.RefObject<HTMLDivElement>;
} {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const updateScrollInfo = (div: HTMLDivElement): void => {
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
  );

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
  }, []);

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

/** Key for local storage to read/write recently opened collections */
const RECENT_COLLECTIONS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_COLLECTIONS = 10;

export type RecentCollection = {
  /** The absolute URL path of the collection resource. */
  url: string;
  /**
   * The user input for the collection resource.
   * If `undefined`, uses the existing label (if already in recent datasets) or reuses the URL (if new).
   */
  label?: string;
};

/**
 * Wrapper around locally-stored recent collections.
 * @returns an array containing the list of recent collections and a function to add a new collection to the list.
 */
export const useRecentCollections = (): [RecentCollection[], (collection: RecentCollection) => void] => {
  const [recentCollections, setRecentCollections] = useLocalStorage<RecentCollection[]>(
    RECENT_COLLECTIONS_STORAGE_KEY,
    []
  );

  const addRecentCollection = (collection: RecentCollection): void => {
    const datasetIndex = recentCollections.findIndex(({ url }) => url === collection.url);
    if (datasetIndex === -1) {
      // New dataset, add to front while maintaining max length
      if (collection.label === undefined) {
        collection.label = collection.url;
      }
      setRecentCollections([collection as RecentCollection, ...recentCollections.slice(0, MAX_RECENT_COLLECTIONS - 1)]);
    } else {
      if (collection.label === undefined) {
        // Reuse existing label
        collection.label = recentCollections[datasetIndex].label;
      }
      // Move to front; this also updates the label if it changed.
      setRecentCollections([
        collection as RecentCollection,

        ...recentCollections.slice(0, datasetIndex),
        ...recentCollections.slice(datasetIndex + 1),
      ]);
    }
  };
  return [recentCollections, addRecentCollection];
};

/**
 * Returns a debounced motion delta array for the given dataset and vector field configuration.
 * @param dataset The dataset to calculate motion deltas for.
 * @param workerPool The worker pool to use for calculations.
 * @param config The vector field configuration to use.
 * @param debounceMs The debounce time in milliseconds. Defaults to 100ms.
 * @returns The motion delta array or `null` if the dataset is invalid. Data will be
 * asynchronously updated as calculations complete.
 */
export const useMotionDeltas = (
  dataset: Dataset | null,
  workerPool: SharedWorkerPool,
  config: VectorConfig,
  debounceMs = 100
): Float32Array | null => {
  const [motionDeltas, setMotionDeltas] = useState<Float32Array | null>(null);
  const pendingVectorConfig = useRef<null | VectorConfig>(null);
  const pendingDataset = useRef<null | Dataset>(null);

  const debouncedVectorConfig = useDebounce(config, debounceMs);

  useEffect(() => {
    if (dataset === null) {
      setMotionDeltas(null);
      return;
    }

    const updateMotionDeltas = async (vectorConfig: VectorConfig): Promise<void> => {
      pendingVectorConfig.current = config;
      pendingDataset.current = dataset;

      const motionDeltas = await workerPool.getMotionDeltas(dataset, vectorConfig);

      // Check that this is still the most recent request before updating state.
      if (vectorConfig === pendingVectorConfig.current && dataset === pendingDataset.current) {
        motionDeltas && setMotionDeltas(motionDeltas);
        pendingVectorConfig.current = null;
        pendingDataset.current = null;
      }
    };
    updateMotionDeltas(config);
  }, [debouncedVectorConfig.timesteps, debouncedVectorConfig.timestepThreshold, dataset]);

  return motionDeltas;
};
