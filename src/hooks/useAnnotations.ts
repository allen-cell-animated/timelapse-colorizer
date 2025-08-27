import { useCallback, useMemo,useState } from "react";

import { AnnotationSelectionMode, Dataset } from "../colorizer";
import { useConstructor } from "./useConstructor";
import { useShortcutKey } from "./useShortcutKey";

import { AnnotationData, AnnotationMergeMode, IAnnotationDataGetters, IAnnotationDataSetters, LabelType } from "../colorizer/AnnotationData";

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
