import React, { EventHandler, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useLocalStorage } from "usehooks-ts";

import { AnnotationSelectionMode } from "../types";
import { useShortcutKey } from "./hooks";

import { AnnotationData, AnnotationMergeMode, IAnnotationDataGetters, IAnnotationDataSetters, LabelType } from "../AnnotationData";
import Dataset from "../Dataset";

// TODO: Move this to a folder outside of `colorizer`.
// TODO: Split this up into multiple files.

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
 * Returns a reference to a constructed value that will not be re-computed
 * between renders.
 *
 * Functionally, this is a wrapper around useRef and guarantees the current
 * value is non-null. See https://react.dev/reference/react/useRef for more
 * details.
 *
 * @param constructor A callback used to assign the value. This will only be
 * called once.
 * @returns A MutableRefObject wrapping the value as returned by the
 * constructor.
 * @example
 * ```
 * // For most use-cases, add `.current` to get the value:
 * const value = useConstructor(() => {return new ValueConstructor()}).current;
 *
 * // You can also modify the value directly if needed:
 * const otherValueRef = useConstructor(() => {return new ValueConstructor()});
 * ...
 * otherValueRef.current = newValue;
 * ```
 */
export function useConstructor<T>(constructor: () => T): MutableRefObject<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = constructor();
  }
  return ref as MutableRefObject<T>;
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

export type AnnotationState = {
  // Viewer state that lives outside the annotation data itself
  currentLabelIdx: number | null;
  setCurrentLabelIdx: (labelIdx: number) => void;
  isAnnotationModeEnabled: boolean;
  setIsAnnotationModeEnabled: (enabled: boolean) => void;
  visible: boolean;
  setVisibility: (visible: boolean) => void;
  /** 
   * Current selection mode. This is typically the `baseSelectionMode`, but it
   * may be temporarily overridden by user hotkeys.
   */
  selectionMode: AnnotationSelectionMode;
  /** User-selected selection mode. */
  baseSelectionMode: AnnotationSelectionMode;
  setBaseSelectionMode: (mode: AnnotationSelectionMode) => void;
  /** 
   * The ID of the last clicked object. `null` if the user clicked on the
   * background. 
   */
  lastClickedId: number | null;
  /** 
   * The ID of the last object that can serve as the start of a range selection.
   * `null` if there is no range start selected.
   */
  rangeStartId: number | null;
  /** 
   * The range of values that should currently be editable. Value is non-null
   * when a user interacts with an annotation in order to edit it.
   */
  activeEditRange: number[] | null;
  clearActiveEditRange: () => void;
  nextDefaultLabelValue: string | null;
  importData: (annotationData: AnnotationData, mode: AnnotationMergeMode) => void;
  /**
   * For a given ID, returns the range of IDs that would be selected if the ID
   * is clicked with range selection mode turned on.
   * @param dataset The dataset to look up track information from.
   * @param id The ID of an object to select with range rules applied.
   * @returns One of the following:
   * - Returns `null` if no range would be selected.
   * - A list of IDs to select if this ID is clicked with range selection mode turned on.
   */
  getSelectRangeFromId: (dataset: Dataset, id: number) => number[] | null;
  handleAnnotationClick: (dataset: Dataset, id: number | null) => void;
  /**
   * Contains annotation data getters. Use this object directly as a dependency
   * in `useMemo` or `useCallback` to trigger updates when the underlying data
   * changes.
   */
  data: IAnnotationDataGetters;
} & IAnnotationDataSetters;

// TODO: Move this into a zustand state slice. A lot of the logic here is
// attempting to synchronize updates between the annotation data and the UI,
// which can be handled by zustand.
export const useAnnotations = (): AnnotationState => {
  const annotationDataRef = useConstructor(() => {return new AnnotationData();});
  const annotationData = annotationDataRef.current;

  const [currentLabelIdx, _setCurrentLabelIdx] = useState<number | null>(null);
  const [isAnnotationEnabled, _setIsAnnotationEnabled] = useState<boolean>(false);
  const [visible, _setVisibility] = useState<boolean>(false);

  const [baseSelectionMode, setBaseSelectionMode] = useState<AnnotationSelectionMode>(AnnotationSelectionMode.TIME);

  const isSelectRangeHotkeyPressed = useShortcutKey("Shift");
  const isReuseValueHotkeyPressed = useShortcutKey("Control");

  const [lastClickedId, setLastClickedId] = useState<number | null>(null);
  const [rangeStartId, setRangeStartId] = useState<number | null>(null);
  /**
   * The last range of IDs that were edited, used for range-related operations.
   * If a user clicks on an object again that is one of the endpoints of this
   * range, any operations will be applied to the entire range. Cleared when
   * another object is clicked.
  */
  const [lastEditedRange, setLastEditedRange] = useState<number[] | null>(null);
  const [activeEditRange, setActiveEditRange] = useState<number[] | null>(null);

  // When in time mode, allow hotkeys to temporarily change to range mode.
  let selectionMode = baseSelectionMode;
  if (isSelectRangeHotkeyPressed) {
    selectionMode = AnnotationSelectionMode.RANGE;
  }

  const setCurrentLabelIdx = (labelIdx: number | null): void => {
    _setCurrentLabelIdx(labelIdx);
    setActiveEditRange(null);
  };

  const setSelectionMode = (newMode: AnnotationSelectionMode): void => {
    if (newMode === baseSelectionMode) {
      return;
    }
    if (newMode === AnnotationSelectionMode.RANGE) {
      // Clear the range-related data when switching, since otherwise
      // it can be confusing to have a previously interacted-with object
      // become part of a selected range.
      setRangeStartId(null);
      setLastEditedRange(null);
    }
    setBaseSelectionMode(newMode);
  };

  /** Increments every time a state update is required. */
  const [dataUpdateCounter, setDataUpdateCounter] = useState(0);

  // Annotation mode can only be enabled if there is at least one label, so create
  // one if necessary.
  const setIsAnnotationEnabled = (enabled: boolean): void => {
    if (enabled === isAnnotationEnabled) {
      return;
    }
    if (enabled) {
      _setVisibility(true);
      if (annotationData.getLabels().length === 0) {
        const newLabelIdx = annotationData.createNewLabel();
        setCurrentLabelIdx(newLabelIdx);
        setDataUpdateCounter((value) => value + 1);
      }
    }
    setLastClickedId(null);
    setRangeStartId(null);
    setLastEditedRange(null);
    setActiveEditRange(null);
    _setIsAnnotationEnabled(enabled);
  };

  const setVisibility = (visible: boolean): void => {
    _setVisibility(visible);
    if (!visible) {
      setIsAnnotationEnabled(false);
    }
  };

  const wrapFunctionInUpdate = <F extends (...args: any[]) => void>(fn: F): F => {
    return <F>function (...args: any[]) {
      const result = fn(...args);
      setDataUpdateCounter((value) => value + 1);
      return result;
    };
  };

  const onDeleteLabel = (labelIdx: number): void => {
    if (currentLabelIdx === null) {
      return;
    }
    // Update selected label index if necessary.
    const labels = annotationData.getLabels();
    if (currentLabelIdx === labelIdx && labels.length > 1) {
      setCurrentLabelIdx(Math.max(currentLabelIdx - 1, 0));
    } else if (currentLabelIdx === labelIdx) {
      setCurrentLabelIdx(null);
      setIsAnnotationEnabled(false);
    } else if (currentLabelIdx > labelIdx) {
      // Decrement because all indices will shift over
      setCurrentLabelIdx(currentLabelIdx - 1);
    }
    return annotationData.deleteLabel(labelIdx);
  };

  /** Returns a list of IDs between two objects in the same track. */
  const getIdsInRange = (dataset: Dataset, id1: number, id2: number): number[] => {
    if (dataset.getTrackId(id1) !== dataset.getTrackId(id2)) {
      throw new Error(`useAnnotations:getIdsInRange: IDs ${id1} and ${id2} are not in the same track.`);
    }
    const track = dataset.getTrack(dataset.getTrackId(id1));
    if (!track) {
      throw new Error(`useAnnotations:getIdsInRange: Track ID ${dataset.getTrackId(id1)} not found.`);
    }
    const idx0 = track.ids.indexOf(id1);
    const idx1 = track.ids.indexOf(id2);
    const startIdx = Math.min(idx0, idx1);
    const endIdx = Math.max(idx0, idx1);
    return track.ids.slice(startIdx, endIdx + 1);
  };

  // Return a list of IDs that would be selected if the ID was clicked with
  // range selection mode turned on.
  const getSelectRangeFromId = useCallback(
    (dataset: Dataset, id: number): number[] | null => {
      // If this ID is one of the endpoints of the last range clicked,
      // return the same range.
      if (lastEditedRange !== null) {
        const firstIdInRange = lastEditedRange[0];
        const lastIdInRange = lastEditedRange[lastEditedRange.length - 1];
        if (id === firstIdInRange || id === lastIdInRange) {
          return lastEditedRange;
        }
      }
      // Otherwise, check if both IDs are in the same track. If so,
      // return a list of the IDs between the two of them.
      if (dataset && rangeStartId !== null) {
        const trackOfRangeStartId = dataset.getTrackId(rangeStartId);
        const trackOfCurrentId = dataset.getTrackId(id);
        if (trackOfRangeStartId === trackOfCurrentId) {
          return getIdsInRange(dataset, rangeStartId, id);
        }
      }
      // IDs are not in the same track.
      return null;
    },
    [lastEditedRange, rangeStartId]
  );

  const nextDefaultLabelValue = useMemo(() => {
    if (currentLabelIdx === null) {
      return null;
    }
    return annotationData.getNextDefaultLabelValue(currentLabelIdx, isReuseValueHotkeyPressed);
  }, [currentLabelIdx, dataUpdateCounter, isReuseValueHotkeyPressed]);

  const handleAnnotationClick = useCallback(
    (dataset: Dataset, id: number | null): void => {
      if (!isAnnotationEnabled || currentLabelIdx === null || id === null) {
        if (isAnnotationEnabled) {
          setLastClickedId(id);
        }
        setRangeStartId(null);
        setLastEditedRange(null);
        setActiveEditRange(null);
        return;
      }
      const track = dataset.getTrack(dataset.getTrackId(id));
      if (!track) {
        throw new Error(`useAnnotations:handleAnnotationClick: Track ID ${dataset.getTrackId(id)} not found.`);
      }
      const isLabeled = annotationData.isLabelOnId(currentLabelIdx, id);
      const labelData = annotationData.getLabels()[currentLabelIdx];

      const toggleRange = (range: number[]): void => {
        const defaultValue = annotationData.getNextDefaultLabelValue(currentLabelIdx, isReuseValueHotkeyPressed);
        if (isLabeled && labelData.options.type === LabelType.BOOLEAN) {
          // Clicking a boolean label toggles the label on and off
          annotationData.removeLabelOnIds(currentLabelIdx, range);
          setActiveEditRange(null);
        } else if (isLabeled) {
          // If clicking on a range that is already labeled, initiate editing of the label value for that range
          setActiveEditRange(range);
        }  else {
          annotationData.setLabelValueOnIds(currentLabelIdx, range, defaultValue);
          setActiveEditRange(null);
        }
      };

      const idRange = getSelectRangeFromId(dataset, id);
      switch (selectionMode) {
        case AnnotationSelectionMode.TRACK:
          // Toggle entire track
          toggleRange(track.ids);
          break;
        case AnnotationSelectionMode.RANGE:
          if (idRange !== null) {
            setLastEditedRange(idRange);
            toggleRange(idRange);
          }
          break;
        case AnnotationSelectionMode.TIME:
        default:
          toggleRange([id]);
      }
      if (idRange !== null ) {
        setRangeStartId(null);
      } else {
        setRangeStartId(id);
      }
      setLastClickedId(id);
      setDataUpdateCounter((value) => value + 1);
    },
    [isAnnotationEnabled, selectionMode, currentLabelIdx, getSelectRangeFromId, isReuseValueHotkeyPressed]
  );

  const clear = (): void => {
    annotationData.clear();
    setCurrentLabelIdx(null);
    setLastEditedRange(null);
    setLastClickedId(null);
    setIsAnnotationEnabled(false);
  };

  const importData = (newData: AnnotationData, mode: AnnotationMergeMode): void => {
    const mergedData = AnnotationData.merge(annotationData, newData, mode);
    annotationDataRef.current = mergedData;
    if (mergedData.getLabels().length > 0) {
      // Update selected label index to make sure it's still valid
      if (currentLabelIdx === null) {
        setCurrentLabelIdx(0);   
      } else if (currentLabelIdx >= mergedData.getLabels().length) {
        setCurrentLabelIdx(mergedData.getLabels().length - 1);
      }
    } else {
      // Disable annotations if there are no labels
      setIsAnnotationEnabled(false);
      setCurrentLabelIdx(null);
    }
  };

  const data = useMemo(
    (): IAnnotationDataGetters => ({
      // Data getters
      getLabels: annotationData.getLabels,
      getLabelsAppliedToId: annotationData.getLabelsAppliedToId,
      getLabeledIds: annotationData.getLabeledIds,
      getTimeToLabelIdMap: annotationData.getTimeToLabelIdMap,
      isLabelOnId: annotationData.isLabelOnId,
      getNextDefaultLabelSettings: annotationData.getNextDefaultLabelSettings,
      toCsv: annotationData.toCsv,
      getNextDefaultLabelValue: annotationData.getNextDefaultLabelValue,
      getValueFromId: annotationData.getValueFromId,
    }),
    [dataUpdateCounter]
  );

  return {
    // UI state
    currentLabelIdx,
    setCurrentLabelIdx,
    isAnnotationModeEnabled: isAnnotationEnabled,
    setIsAnnotationModeEnabled: setIsAnnotationEnabled,
    visible,
    setVisibility,
    selectionMode,
    baseSelectionMode,
    setBaseSelectionMode: setSelectionMode,
    data,
    handleAnnotationClick,
    nextDefaultLabelValue,
    lastClickedId,
    rangeStartId,
    activeEditRange,
    clearActiveEditRange: () => setActiveEditRange(null),
    getSelectRangeFromId,
    // Wrap state mutators
    createNewLabel: wrapFunctionInUpdate(annotationData.createNewLabel),
    setLabelOptions: wrapFunctionInUpdate(annotationData.setLabelOptions),
    deleteLabel: wrapFunctionInUpdate(onDeleteLabel),
    setLabelValueOnIds: wrapFunctionInUpdate(annotationData.setLabelValueOnIds),
    removeLabelOnIds: wrapFunctionInUpdate(annotationData.removeLabelOnIds),
    clear: wrapFunctionInUpdate(clear),
    importData: wrapFunctionInUpdate(importData),
  };
};
