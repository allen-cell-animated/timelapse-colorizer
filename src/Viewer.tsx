import {
  CaretRightOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  PauseOutlined,
  StepBackwardFilled,
  StepForwardFilled,
} from "@ant-design/icons";
import { Checkbox, notification, Slider, Tabs } from "antd";
import { NotificationConfig } from "antd/es/notification/interface";
import React, { ReactElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, Location, useLocation, useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

import {
  Dataset,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_KEYS,
  isThresholdNumeric,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
  LoadTroubleshooting,
  ReportWarningCallback,
  TabType,
} from "./colorizer";
import { AnalyticsEvent, triggerAnalyticsEvent } from "./colorizer/utils/analytics";
import { thresholdMatchFinder } from "./colorizer/utils/data_utils";
import { useAnnotations, useConstructor, useDebounce, useRecentCollections } from "./colorizer/utils/react_utils";
import * as urlUtils from "./colorizer/utils/url_utils";
import { SelectItem } from "./components/Dropdowns/types";
import { SCATTERPLOT_TIME_FEATURE } from "./components/Tabs/scatter_plot_data_utils";
import { DEFAULT_PLAYBACK_FPS, INTERNAL_BUILD } from "./constants";
import { selectVectorConfigFromState } from "./state/slices";
import { FlexRow, FlexRowAlignCenter } from "./styles/utils";
import { LocationState } from "./types";

import CanvasWithOverlay from "./colorizer/CanvasWithOverlay";
import Collection from "./colorizer/Collection";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";
import { FeatureType } from "./colorizer/Dataset";
import UrlArrayLoader from "./colorizer/loaders/UrlArrayLoader";
import { getSharedWorkerPool } from "./colorizer/workers/SharedWorkerPool";
import { AppThemeContext } from "./components/AppStyle";
import { useAlertBanner } from "./components/Banner";
import TextButton from "./components/Buttons/TextButton";
import CanvasWrapper from "./components/CanvasWrapper";
import CategoricalColorPicker from "./components/CategoricalColorPicker";
import ColorRampDropdown from "./components/Dropdowns/ColorRampDropdown";
import HelpDropdown from "./components/Dropdowns/HelpDropdown";
import SelectionDropdown from "./components/Dropdowns/SelectionDropdown";
import Export from "./components/Export";
import GlossaryPanel from "./components/GlossaryPanel";
import Header from "./components/Header";
import IconButton from "./components/IconButton";
import LabeledSlider from "./components/LabeledSlider";
import LoadDatasetButton from "./components/LoadDatasetButton";
import SmallScreenWarning from "./components/Modals/SmallScreenWarning";
import PlaybackSpeedControl from "./components/PlaybackSpeedControl";
import SpinBox from "./components/SpinBox";
import {
  AnnotationTab,
  CorrelationPlotTab,
  FeatureThresholdsTab,
  PlotTab,
  ScatterPlotTab,
  SettingsTab,
} from "./components/Tabs";
import CanvasHoverTooltip from "./components/Tooltips/CanvasHoverTooltip";
import { useViewerStateStore } from "./state/ViewerState";

// TODO: Refactor with styled-components
import styles from "./Viewer.module.css";

function Viewer(): ReactElement {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////
  const theme = useContext(AppThemeContext);
  const location = useLocation();

  const [, startTransition] = React.useTransition();

  const canv = useConstructor(() => {
    const canvas = new CanvasWithOverlay();
    canvas.domElement.className = styles.colorizeCanvas;
    useViewerStateStore.getState().setLoadFrameCallback(async (frame) => {
      await canvas.setFrame(frame);
      canvas.render();
    });
    return canvas;
  });

  const store = useViewerStateStore(
    useShallow((state) => ({
      dataset: state.dataset,
      datasetKey: state.datasetKey,
      featureKey: state.featureKey,
      collection: state.collection,
      setCollection: state.setCollection,
      setFeatureKey: state.setFeatureKey,
      setDataset: state.setDataset,
    }))
  );
  const { dataset, datasetKey, featureKey, collection, setCollection, setDataset, setFeatureKey } = store;

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey);
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];
  const featureNameWithUnits = isFeatureSelected ? dataset.getFeatureNameWithUnits(featureKey) : undefined;

  // TODO: Remove these when URL parameter initialization and updating is moved
  // into a helper method/out of the component
  /** Backdrop key is null if the dataset has no backdrops, or during initialization. */
  const selectedBackdropKey = useViewerStateStore((state) => state.backdropKey);
  const setSelectedBackdropKey = useViewerStateStore((state) => state.setBackdropKey);

  const [, addRecentCollection] = useRecentCollections();

  // Shared worker pool for background operations (e.g. loading data)
  const workerPool = getSharedWorkerPool();
  const arrayLoader = useConstructor(() => new UrlArrayLoader(workerPool));

  const selectedTrack = useViewerStateStore((state) => state.track);
  const setSelectedTrack = useViewerStateStore((state) => state.setTrack);

  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setFrame = useViewerStateStore((state) => state.setFrame);

  const annotationState = useAnnotations();

  const setScatterXAxis = useViewerStateStore((state) => state.setScatterXAxis);
  const setScatterYAxis = useViewerStateStore((state) => state.setScatterYAxis);
  const setScatterRangeType = useViewerStateStore((state) => state.setScatterRangeType);
  const openTab = useViewerStateStore((state) => state.openTab);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);

  const vectorConfig = useViewerStateStore(useShallow(selectVectorConfigFromState));

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);
  const [datasetLoadProgress, setDatasetLoadProgress] = useState<number | null>(null);
  const [datasetOpen, setDatasetOpen] = useState(false);

  const colorRampData = KNOWN_COLOR_RAMPS;

  // TODO: Tidy up these state slices once data logic is moved out of this file.
  const colorRampKey = useViewerStateStore((state) => state.colorRampKey);
  const setColorRampKey = useViewerStateStore((state) => state.setColorRampKey);
  const colorRampReversed = useViewerStateStore((state) => state.isColorRampReversed);
  const setColorRampReversed = useViewerStateStore((state) => state.setColorRampReversed);
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);
  const keepColorRampRange = useViewerStateStore((state) => state.keepColorRampRange);
  const setKeepColorRampRange = useViewerStateStore((state) => state.setKeepColorRampRange);
  const selectedPaletteKey = useViewerStateStore((state) => state.categoricalPaletteKey);
  const categoricalPalette = useViewerStateStore((state) => state.categoricalPalette);
  const setCategoricalPalette = useViewerStateStore((state) => state.setCategoricalPalette);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);
  const setFeatureThresholds = useViewerStateStore((state) => state.setThresholds);

  const [playbackFps, setPlaybackFps] = useState(DEFAULT_PLAYBACK_FPS);

  const [searchParams, setSearchParams] = useSearchParams();
  // Provides a mounting point for Antd's notification component. Otherwise, the notifications
  // are mounted outside of App and don't receive CSS styling variables.
  const notificationContainer = useRef<HTMLDivElement>(null);
  const notificationConfig: NotificationConfig = {
    getContainer: () => notificationContainer.current as HTMLElement,
  };
  const [notificationApi, notificationContextHolder] = notification.useNotification(notificationConfig);

  const { bannerElement, showAlert, clearBanners } = useAlertBanner();
  /** Alerts that should be shown for a dataset that is currently being loaded but is not yet displayed. */
  const pendingAlerts = useRef<(() => void)[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  // TODO: Move all logic for the time slider into its own component!
  // Flag used to indicate that the slider is currently being dragged while playback is occurring.
  const [isTimeSliderDraggedDuringPlayback, setIsTimeSliderDraggedDuringPlayback] = useState(false);

  useEffect(() => {
    if (timeControls.isPlaying()) {
      setIsTimeSliderDraggedDuringPlayback(false);
    }
  }, [timeControls.isPlaying()]);

  const timeSliderContainerRef = useRef<HTMLDivElement>(null);
  /** The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);
  const [lastValidHoveredId, setLastValidHoveredId] = useState<number>(-1);
  const [showObjectHoverInfo, setShowObjectHoverInfo] = useState(false);
  const currentHoveredId = showObjectHoverInfo ? lastValidHoveredId : null;

  // EVENT LISTENERS ////////////////////////////////////////////////////////

  // Sync the time slider with the pending frame.
  useEffect(() => {
    const unsubscribe = useViewerStateStore.subscribe(
      (state) => [state.pendingFrame],
      ([pendingFrame]) => {
        if (isTimeSliderDraggedDuringPlayback) {
          return;
        }
        setFrameInput(pendingFrame);
      }
    );
    return unsubscribe;
  }, [isTimeSliderDraggedDuringPlayback]);

  // When the scatterplot tab is opened for the first time, set the default axes
  // to the selected feature and time.
  useEffect(() => {
    const unsubscribe = useViewerStateStore.subscribe(
      (state) => [state.openTab, state.dataset],
      ([openTab, dataset]) => {
        if (openTab === TabType.SCATTER_PLOT && dataset) {
          if (
            useViewerStateStore.getState().scatterXAxis === null &&
            useViewerStateStore.getState().scatterYAxis === null
          ) {
            setScatterXAxis(SCATTERPLOT_TIME_FEATURE.value);
            setScatterYAxis(featureKey);
          }
        }
      }
    );
    return unsubscribe;
  }, [dataset, featureKey]);

  // Warn on tab close if there is annotation data.
  useEffect(() => {
    const beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
      if (annotationState.data.getLabels().length === 0) {
        return;
      }
      event.preventDefault();
      // Note that `event.returnValue` is deprecated for most (but not all) browsers.
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
      event.returnValue = "You have unsaved annotations. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [annotationState.data]);

  // UTILITY METHODS /////////////////////////////////////////////////////////////

  /**
   * Formats the dataset and collection parameters for use in a URL.
   */
  const getDatasetAndCollectionParam = useCallback((): {
    datasetParam?: string;
    collectionParam?: string;
  } => {
    if (collection?.url === null) {
      // A single dataset was loaded, so there's no collection URL. Use the dataset URL instead.
      return { datasetParam: dataset?.manifestUrl, collectionParam: undefined };
    } else {
      return { datasetParam: datasetKey ?? undefined, collectionParam: collection?.url };
    }
  }, [datasetKey, dataset, collection]);

  /**
   * Get the optional color map feature range parameter for the URL. If the range
   * is the full range of the feature's values (default), return undefined.
   */
  const getRangeParam = useCallback((): [number, number] | undefined => {
    if (!dataset || !featureKey) {
      return undefined;
    }
    // check if current selected feature range matches the default feature range; if so, don't provide
    // a range parameter.
    const featureData = dataset.getFeatureData(featureKey);
    if (featureData) {
      if (featureData.min === colorRampMin && featureData.max === colorRampMax) {
        return undefined;
      }
    }
    return [colorRampMin, colorRampMax];
  }, [colorRampMin, colorRampMax, featureKey, dataset]);

  /**
   * Get a URL query string representing the current collection, dataset, feature, track,
   * and frame information.
   */
  const getUrlParams = useCallback((): string => {
    const { datasetParam, collectionParam } = getDatasetAndCollectionParam();
    const rangeParam = getRangeParam();
    const state: Partial<urlUtils.UrlParams> = {
      collection: collectionParam,
      dataset: datasetParam,
      feature: featureKey ?? undefined,
      track: selectedTrack?.trackId,
      // Ignore time=0 to reduce clutter
      time: currentFrame !== 0 ? currentFrame : undefined,
      thresholds: featureThresholds,
      range: rangeParam,
      colorRampKey,
      colorRampReversed,
      categoricalPalette: categoricalPalette,
      // TODO: This is a patch to keep vector state saved to the URL while the
      // state store is being refactored. This should be removed once
      // ViewerConfig is moved into the state store.
      // config: { ...config, vectorConfig },
      selectedBackdropKey,
      // scatterPlotConfig,
    };
    return urlUtils.paramsToUrlQueryString(state);
  }, [
    getDatasetAndCollectionParam,
    getRangeParam,
    featureKey,
    selectedTrack,
    currentFrame,
    featureThresholds,
    colorRampKey,
    colorRampReversed,
    categoricalPalette,
    // config,
    vectorConfig,
    selectedBackdropKey,
    // scatterPlotConfig,
  ]);

  // Update url whenever the viewer settings change, with a few exceptions:
  // - The URL should not change while playing/recording for performance reasons.
  // - The URL should not change if the dataset hasn't loaded yet, or if it failed to load.
  //   that way, users can refresh the page to try again.
  useEffect(() => {
    if (!timeControls.isPlaying() && !isRecording && isInitialDatasetLoaded) {
      setSearchParams(getUrlParams(), { replace: true });
    }
  }, [timeControls.isPlaying(), isRecording, getUrlParams, isInitialDatasetLoaded]);

  /**
   * Fire a custom analytics event when a feature is selected.
   */
  const reportFeatureSelected = useCallback((featureDataset: Dataset, newFeatureKey: string): void => {
    const featureData = featureDataset.getFeatureData(newFeatureKey);
    if (featureData) {
      const range =
        featureData.type === FeatureType.CATEGORICAL
          ? featureData.categories!.length
          : featureData.max - featureData.min;
      triggerAnalyticsEvent(AnalyticsEvent.FEATURE_SELECTED, {
        featureType: featureData.type,
        featureRange: range,
      });
    }
  }, []);

  const openScatterPlotTab = useCallback(
    (xAxis: string, yAxis: string) => {
      setOpenTab(TabType.SCATTER_PLOT);
      setScatterXAxis(xAxis);
      setScatterYAxis(yAxis);
    },
    [setOpenTab, setScatterXAxis, setScatterYAxis]
  );

  // DATASET LOADING ///////////////////////////////////////////////////////

  const handleProgressUpdate = useCallback((complete: number, total: number): void => {
    startTransition(() => {
      setDatasetLoadProgress(Math.round((complete / total) * 100));
    });
  }, []);

  const showDatasetLoadError = useCallback(
    (errorMessage?: string): void => {
      const description: string[] = [
        errorMessage
          ? `Encountered the following error when loading the dataset: "${errorMessage}"`
          : "Encountered an error when loading the dataset.",
        LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
      ];

      showAlert({
        type: "error",
        message: "Dataset could not be loaded.",
        description,
        closable: false,
        action: <Link to="/">Return to homepage</Link>,
      });
    },
    [showAlert]
  );

  const showDatasetLoadWarning: ReportWarningCallback = useCallback(
    (message: string, description: string | string[]) => {
      pendingAlerts.current.push(() => {
        showAlert({
          type: "warning",
          message: message,
          description: description,
          closable: true,
        });
      });
    },
    [showAlert]
  );

  /**
   * Replaces the current dataset with another loaded dataset. Handles cleanup and state changes.
   * @param newDataset the new Dataset to replace the existing with. If null, does nothing.
   * @param newDatasetKey the key of the new dataset in the Collection.
   * @returns a Promise<void> that resolves when the loading is complete.
   */
  const replaceDataset = useCallback(
    async (newDataset: Dataset, newDatasetKey: string): Promise<void> => {
      console.trace("Replacing dataset with " + newDatasetKey + ".");
      // TODO: Change the way flags are handled to prevent flickering during dataset replacement
      setDatasetOpen(false);

      // Dispose of the old dataset
      if (dataset !== null) {
        dataset.dispose();
      }

      // Manage dataset-related alert banners
      clearBanners();
      for (const alert of pendingAlerts.current) {
        alert();
      }
      pendingAlerts.current = [];

      // State updates
      setDataset(newDatasetKey, newDataset);
      await canv.setDataset(newDataset);

      setDatasetOpen(true);
      console.log("Dataset metadata:", newDataset.metadata);
      console.log("Num Items:" + newDataset?.numObjects);
    },
    [dataset, featureKey, canv, currentFrame, getUrlParams, featureThresholds]
  );

  // INITIAL SETUP  ////////////////////////////////////////////////////////////////

  // Only retrieve parameters once, because the URL can be updated by state updates
  // and lose information (like the track, feature, time, etc.) that isn't
  // accessed in the first render.
  const initialUrlParams = useConstructor(() => {
    return urlUtils.loadFromUrlSearchParams(searchParams);
  });

  // Load URL parameters into the state that don't require a dataset to be loaded.
  // This reduces flicker on initial load.
  useEffect(() => {
    // Load the currently selected color ramp info from the URL, if it exists.
    if (initialUrlParams.colorRampKey && colorRampData.has(initialUrlParams.colorRampKey)) {
      setColorRampKey(initialUrlParams.colorRampKey);
    }
    if (initialUrlParams.colorRampReversed) {
      setColorRampReversed(initialUrlParams.colorRampReversed);
    }
    if (initialUrlParams.categoricalPalette) {
      setCategoricalPalette(initialUrlParams.categoricalPalette);
    }
  }, []);

  // Break React rules to prevent a race condition where the initial dataset is reloaded
  // when useEffect gets fired twice. This caused certain URL parameters like time to get
  // lost or reset.
  const isLoadingInitialDataset = useRef<boolean>(false);

  // Attempt to load database and collections data from the URL.
  // This is memoized so that it only runs one time on startup.
  useEffect(() => {
    const loadInitialDataset = async (): Promise<void> => {
      if (isLoadingInitialDataset.current || isInitialDatasetLoaded) {
        return;
      }
      setIsDatasetLoading(true);
      isLoadingInitialDataset.current = true;
      let newCollection: Collection;
      let datasetKey: string;

      const locationHasCollectionAndDataset = (location: Location): boolean => {
        return location.state && "collection" in location.state && "datasetKey" in location.state;
      };

      // Check if we were passed a collection + dataset from the previous page.
      if (locationHasCollectionAndDataset(location)) {
        // Collect from previous page state
        const { collection: stateCollection, datasetKey: stateDatasetKey } = location.state as LocationState;
        datasetKey = stateDatasetKey;
        newCollection = stateCollection;
      } else {
        // Collect from URL
        const collectionUrlParam = initialUrlParams.collection;
        const datasetParam = initialUrlParams.dataset;

        if (datasetParam && urlUtils.isUrl(datasetParam) && !collectionUrlParam) {
          // Dataset is a URL and no collection URL is provided;
          // Make a dummy collection that will include only this dataset
          newCollection = await Collection.makeCollectionFromSingleDataset(datasetParam);
          datasetKey = newCollection.getDefaultDatasetKey();
        } else {
          if (!collectionUrlParam) {
            showAlert({
              message: "No dataset loaded.",
              type: "info",
              closable: false,
              description: [
                "You'll need to load a dataset to use Timelapse Feature Explorer.",
                "If you have a dataset, load it from the menu above. Otherwise, return to the homepage to see our published datasets.",
              ],
              action: <Link to="/">Return to homepage</Link>,
            });
            console.error("No collection URL or dataset URL provided.");
            setIsDatasetLoading(false);
            return;
          }
          // Try loading the collection, with the default collection as a fallback.

          try {
            newCollection = await Collection.loadCollection(collectionUrlParam, {
              reportWarning: showDatasetLoadWarning,
            });
            datasetKey = datasetParam || newCollection.getDefaultDatasetKey();
          } catch (error) {
            console.error(error);
            showDatasetLoadError((error as Error).message);
            setIsDatasetLoading(false);
            return;
          }
        }
      }

      setCollection(newCollection);
      setDatasetLoadProgress(null);
      const datasetResult = await newCollection.tryLoadDataset(datasetKey, {
        onLoadProgress: handleProgressUpdate,
        arrayLoader,
        reportWarning: showDatasetLoadWarning,
      });

      if (!datasetResult.loaded) {
        console.error(datasetResult.errorMessage);
        showDatasetLoadError(datasetResult.errorMessage);
        setIsDatasetLoading(false);
        return;
      }
      // Add the collection to the recent collections list
      addRecentCollection({ url: newCollection.getUrl() });

      if (!isInitialDatasetLoaded) {
        await replaceDataset(datasetResult.dataset, datasetKey);
        setIsInitialDatasetLoaded(true);
      }
      setIsDatasetLoading(false);
      return;
    };
    loadInitialDataset();
  }, []);

  // Load additional properties from the URL, including the time, track, and feature.
  // Run only once after the first dataset has been loaded.
  useEffect(() => {
    if (!isInitialDatasetLoaded) {
      return;
    }
    // TODO: Move initial parsing out of `Viewer.tsx` once state store is
    // fully implemented.
    const setupInitialParameters = async (): Promise<void> => {
      if (initialUrlParams.thresholds) {
        setFeatureThresholds(initialUrlParams.thresholds);
      }
      if (initialUrlParams.feature && dataset) {
        // Load feature (if unset, do nothing because replaceDataset already loads a default)
        setFeatureKey(dataset.findFeatureByKeyOrName(initialUrlParams.feature) || dataset.featureKeys[0]);
      }
      // Range, track, and time setting must be done after the dataset and feature is set.
      if (initialUrlParams.range) {
        setColorRampRange(initialUrlParams.range);
      }

      if (initialUrlParams.track && initialUrlParams.track >= 0) {
        // Highlight the track. Seek to start of frame only if time is not defined.
        const track = dataset?.getTrack(initialUrlParams.track);
        if (track) {
          setSelectedTrack(track);
          if (initialUrlParams.time === undefined) {
            setFrame(track.times[0]);
          }
        }
      }
      if (initialUrlParams.time && initialUrlParams.time >= 0) {
        // Load time (if unset, defaults to track time or default t=0)
        const newTime = initialUrlParams.time;
        setFrame(newTime);
        setFrameInput(newTime);
      }

      const backdropKey = initialUrlParams.selectedBackdropKey;
      if (backdropKey) {
        if (dataset?.hasBackdrop(backdropKey)) {
          setSelectedBackdropKey(dataset, backdropKey);
        }
      }
      if (initialUrlParams.config) {
        // updateConfig(initialUrlParams.config);
      }

      if (initialUrlParams.scatterPlotConfig) {
        const newScatterPlotConfig = initialUrlParams.scatterPlotConfig;
        // For backwards-compatibility, cast xAxis and yAxis to feature keys.
        if (newScatterPlotConfig.xAxis) {
          const xAxis = newScatterPlotConfig.xAxis;
          const newXAxis = xAxis === SCATTERPLOT_TIME_FEATURE.value ? xAxis : dataset?.findFeatureByKeyOrName(xAxis);
          setScatterXAxis(newXAxis ?? null);
        }
        if (newScatterPlotConfig.yAxis) {
          const yAxis = newScatterPlotConfig.yAxis;
          const newYAxis = yAxis === SCATTERPLOT_TIME_FEATURE.value ? yAxis : dataset?.findFeatureByKeyOrName(yAxis);
          setScatterYAxis(newYAxis ?? null);
        }
        if (newScatterPlotConfig.rangeType) {
          setScatterRangeType(newScatterPlotConfig.rangeType);
        }
      }
    };

    setupInitialParameters();
  }, [isInitialDatasetLoaded]);

  // DISPLAY CONTROLS //////////////////////////////////////////////////////
  const handleDatasetChange = useCallback(
    async (newDatasetKey: string): Promise<void> => {
      if (newDatasetKey !== datasetKey && collection) {
        setIsDatasetLoading(true);
        setDatasetLoadProgress(null);
        const result = await collection.tryLoadDataset(newDatasetKey, {
          onLoadProgress: handleProgressUpdate,
          arrayLoader,
          reportWarning: showDatasetLoadWarning,
        });
        if (result.loaded) {
          await replaceDataset(result.dataset, newDatasetKey);
        } else {
          // Show notification popup for datasets that can't be loaded.
          console.error(result.errorMessage);
          notificationApi["error"]({
            message: "Dataset load failed",
            description: result.errorMessage,
            placement: "bottomLeft",
            duration: 12,
            style: {
              backgroundColor: theme.color.alert.fill.error,
              border: `1px solid ${theme.color.alert.border.error}`,
            },
          });
        }
        setIsDatasetLoading(false);
      }
    },
    [replaceDataset, handleProgressUpdate, collection, datasetKey]
  );

  /**
   * Attempt to load a URL provided in the Load menu.
   * The URL may either be a collection or a dataset, so handle it as an ambiguous URL.
   * @throws an error if the URL could not be loaded.
   * @returns the absolute path of the URL resource that was loaded.
   */
  const handleDatasetLoad = useCallback(
    (newCollection: Collection, newDatasetKey: string, newDataset: Dataset): void => {
      setCollection(newCollection);
      replaceDataset(newDataset, newDatasetKey);
    },
    [replaceDataset]
  );

  // SCRUBBING CONTROLS ////////////////////////////////////////////////////
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "Left") {
        timeControls.advanceFrame(-1);
      } else if (e.key === "ArrowRight" || e.key === "Right") {
        timeControls.advanceFrame(1);
      }
    },
    [timeControls]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Store the current value of the time slider as its own state, and update
  // the frame using a debounced value to prevent constant updates as it moves.
  const debouncedFrameInput = useDebounce(frameInput, 250);
  useEffect(() => {
    if (!timeControls.isPlaying() && currentFrame !== debouncedFrameInput) {
      setFrame(debouncedFrameInput);
    }
    // Dependency only contains debouncedFrameInput to prevent time from jumping back
    // to old debounced values when time playback is paused.
  }, [debouncedFrameInput]);

  // When the slider is released, check if playback was occurring and resume it.
  // We need to attach the pointerup event listener to the document because it will not fire
  // if the user releases the pointer outside of the slider.
  useEffect(() => {
    const checkIfPlaybackShouldUnpause = async (event: PointerEvent): Promise<void> => {
      const target = event.target;
      if (target && timeSliderContainerRef.current?.contains(target as Node)) {
        // If the user clicked and released on the slider, update the
        // time immediately.
        setFrame(frameInput);
      }
      if (isTimeSliderDraggedDuringPlayback) {
        setFrame(frameInput);
        // Update the frame and unpause playback when the slider is released.
        setIsTimeSliderDraggedDuringPlayback(false);
        timeControls.play(); // resume playing
      }
    };

    document.addEventListener("pointerup", checkIfPlaybackShouldUnpause);
    return () => {
      document.removeEventListener("pointerup", checkIfPlaybackShouldUnpause);
    };
  }, [isTimeSliderDraggedDuringPlayback, frameInput]);

  const onClickId = useCallback(
    (id: number) => {
      if (dataset) {
        annotationState.handleAnnotationClick(dataset, id);
      }
    },
    [dataset, annotationState.handleAnnotationClick]
  );

  // RENDERING /////////////////////////////////////////////////////////////

  const openCopyNotification = (): void => {
    navigator.clipboard.writeText(document.URL);
    notificationApi["success"]({
      message: "URL copied to clipboard",
      placement: "bottomLeft",
      duration: 4,
      icon: <CheckCircleOutlined style={{ color: theme.color.text.success }} />,
      style: {
        backgroundColor: theme.color.alert.fill.success,
        border: `1px solid ${theme.color.alert.border.success}`,
      },
    });
  };

  const datasetDropdownData = useMemo(() => collection?.getDatasetKeys() || [], [collection]);
  const featureDropdownData = useMemo((): SelectItem[] => {
    if (!dataset) {
      return [];
    }
    // Add units to the dataset feature names if present
    return dataset.featureKeys.map((key) => {
      return { value: key, label: dataset.getFeatureNameWithUnits(key) };
    });
  }, [dataset]);

  const disableUi: boolean = isRecording || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  // TODO: Move into subcomponent for color ramp controls
  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const getColorMapSliderMarks = (): undefined | number[] => {
    if (dataset === null || featureKey === null || featureThresholds.length === 0) {
      return undefined;
    }
    const featureData = dataset.getFeatureData(featureKey);
    if (!featureData) {
      return undefined;
    }
    const threshold = featureThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
    if (!threshold || !isThresholdNumeric(threshold)) {
      return undefined;
    }
    return [threshold.min, threshold.max];
  };

  const allTabItems = [
    {
      label: "Track plot",
      key: TabType.TRACK_PLOT,
      children: (
        <div className={styles.tabContent}>
          <PlotTab disabled={disableUi} />
        </div>
      ),
    },
    {
      label: "Scatter plot",
      key: TabType.SCATTER_PLOT,
      children: (
        <div className={styles.tabContent}>
          <ScatterPlotTab
            isVisible={openTab === TabType.SCATTER_PLOT}
            isPlaying={timeControls.isPlaying() || isRecording}
            showAlert={showAlert}
          />
        </div>
      ),
    },
    {
      label: "Correlation plot",
      key: TabType.CORRELATION_PLOT,
      visible: INTERNAL_BUILD,
      children: (
        <div className={styles.tabContent}>
          <CorrelationPlotTab openScatterPlotTab={openScatterPlotTab} workerPool={workerPool} dataset={dataset} />
        </div>
      ),
    },
    {
      label: `Filters ${featureThresholds.length > 0 ? `(${featureThresholds.length})` : ""}`,
      key: TabType.FILTERS,
      children: (
        <div className={styles.tabContent}>
          <FeatureThresholdsTab disabled={disableUi} />
        </div>
      ),
    },
    {
      label: "Annotations",
      key: TabType.ANNOTATION,
      visible: INTERNAL_BUILD,
      children: (
        <div className={styles.tabContent}>
          <AnnotationTab annotationState={annotationState} hoveredId={currentHoveredId} />
        </div>
      ),
    },
    {
      label: "Viewer settings",
      key: TabType.SETTINGS,
      children: (
        <div className={styles.tabContent}>
          <SettingsTab />
        </div>
      ),
    },
  ];
  const tabItems = allTabItems.filter((item) => item.visible !== false);

  let datasetHeader: ReactNode = null;
  if (collection && collection.metadata.name) {
    datasetHeader = collection.metadata.name;
  } else if (dataset && dataset.metadata.name) {
    datasetHeader = dataset.metadata.name;
  } else if (dataset) {
    datasetHeader = <span style={{ color: theme.color.text.hint }}>Untitled dataset</span>;
  } else {
    datasetHeader = null;
  }

  return (
    <div>
      <div ref={notificationContainer}>{notificationContextHolder}</div>
      <SmallScreenWarning />

      <Header alertElement={bannerElement} headerOpensInNewTab={true}>
        <h3>{datasetHeader}</h3>
        <FlexRowAlignCenter $gap={12} $wrap="wrap">
          <FlexRowAlignCenter $gap={2} $wrap="wrap">
            <LoadDatasetButton
              onLoad={handleDatasetLoad}
              currentResourceUrl={collection?.url ?? datasetKey ?? ""}
              reportWarning={showDatasetLoadWarning}
            />
            <Export
              totalFrames={dataset?.numberOfFrames || 0}
              setFrame={setFrame}
              getCanvasExportDimensions={() => canv.getExportDimensions()}
              getCanvas={() => canv.domElement}
              // Stop playback when exporting
              onClick={() => timeControls.pause()}
              currentFrame={currentFrame}
              defaultImagePrefix={datasetKey + "-" + featureKey}
              disabled={dataset === null}
              setIsRecording={setIsRecording}
            />
            <TextButton onClick={openCopyNotification}>
              <LinkOutlined />
              <p>Copy URL</p>
            </TextButton>
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>

      {/** Main Content: Contains canvas and plot, ramp controls, time controls, etc. */}
      <div className={styles.mainContent}>
        {/** Top Control Bar */}
        <FlexRowAlignCenter $gap={20} style={{ margin: "16px 0", flexWrap: "wrap" }}>
          <SelectionDropdown
            disabled={disableUi}
            label="Dataset"
            selected={datasetKey ?? ""}
            buttonType="primary"
            items={datasetDropdownData}
            onChange={handleDatasetChange}
          />
          <FlexRow $gap={6}>
            <SelectionDropdown
              disabled={disableUi}
              label="Feature"
              // TODO: Show feature description here?
              selected={featureKey ?? undefined}
              items={featureDropdownData}
              onChange={(value) => {
                if (value !== featureKey && dataset) {
                  setFeatureKey(value);
                  reportFeatureSelected(dataset, value);
                }
              }}
            />
            <GlossaryPanel dataset={dataset} />
          </FlexRow>

          <ColorRampDropdown
            knownColorRamps={KNOWN_COLOR_RAMPS}
            colorRampsToDisplay={DISPLAY_COLOR_RAMP_KEYS}
            selectedRamp={colorRampKey}
            reversed={colorRampReversed}
            onChangeRamp={(name, reversed) => {
              setColorRampKey(name);
              setColorRampReversed(reversed);
            }}
            disabled={disableUi}
            knownCategoricalPalettes={KNOWN_CATEGORICAL_PALETTES}
            categoricalPalettesToDisplay={DISPLAY_CATEGORICAL_PALETTE_KEYS}
            useCategoricalPalettes={isFeatureCategorical}
            numCategories={Math.max(featureCategories.length, 1)}
            selectedPalette={categoricalPalette}
            selectedPaletteKey={selectedPaletteKey}
            onChangePalette={setCategoricalPalette}
          />
        </FlexRowAlignCenter>

        {/* Organize the main content areas */}
        <div className={styles.contentPanels}>
          <div className={styles.canvasPanel}>
            {/** Canvas */}
            <div className={styles.canvasTopAndCanvasContainer}>
              <div className={styles.canvasTopContainer}>
                <h3 style={{ margin: "0" }}>{featureNameWithUnits ?? "Feature value range"}</h3>
                <FlexRowAlignCenter $gap={12} style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div style={{ flexBasis: 250, flexShrink: 2, flexGrow: 2, minWidth: "75px" }}>
                    {
                      // Render either a categorical color picker or a range slider depending on the feature type
                      isFeatureCategorical ? (
                        <CategoricalColorPicker categories={featureCategories} disabled={disableUi} />
                      ) : (
                        <LabeledSlider
                          type="range"
                          min={colorRampMin}
                          max={colorRampMax}
                          minSliderBound={featureKey !== null ? dataset?.getFeatureData(featureKey)?.min : undefined}
                          maxSliderBound={featureKey !== null ? dataset?.getFeatureData(featureKey)?.max : undefined}
                          onChange={function (min: number, max: number): void {
                            setColorRampRange([min, max]);
                          }}
                          marks={getColorMapSliderMarks()}
                          disabled={disableUi}
                        />
                      )
                    }
                  </div>
                  <div style={{ flexBasis: 100, flexShrink: 1, flexGrow: 1, width: "fit-content" }}>
                    <Checkbox
                      checked={keepColorRampRange}
                      onChange={() => {
                        // Invert lock on range
                        setKeepColorRampRange(!keepColorRampRange);
                      }}
                    >
                      Keep range when switching datasets and features
                    </Checkbox>
                  </div>
                </FlexRowAlignCenter>
              </div>
              <CanvasHoverTooltip
                lastValidHoveredId={lastValidHoveredId}
                showObjectHoverInfo={showObjectHoverInfo}
                annotationState={annotationState}
              >
                <CanvasWrapper
                  loading={isDatasetLoading}
                  loadingProgress={datasetLoadProgress}
                  canv={canv}
                  isRecording={isRecording}
                  onClickId={onClickId}
                  onMouseHover={(id: number): void => {
                    const isObject = id !== BACKGROUND_ID;
                    setShowObjectHoverInfo(isObject);
                    if (isObject) {
                      setLastValidHoveredId(id);
                    }
                  }}
                  onMouseLeave={() => setShowObjectHoverInfo(false)}
                  showAlert={isInitialDatasetLoaded ? showAlert : undefined}
                  annotationState={annotationState}
                />
              </CanvasHoverTooltip>
            </div>

            {/** Time Control Bar */}
            <div className={styles.timeControls}>
              {timeControls.isPlaying() || isTimeSliderDraggedDuringPlayback ? (
                // Swap between play and pause button
                <IconButton
                  type="primary"
                  disabled={disableTimeControlsUi}
                  onClick={() => {
                    timeControls.pause();
                    setFrameInput(currentFrame);
                  }}
                >
                  <PauseOutlined />
                </IconButton>
              ) : (
                <IconButton type="primary" disabled={disableTimeControlsUi} onClick={() => timeControls.play()}>
                  <CaretRightOutlined />
                </IconButton>
              )}

              <div
                ref={timeSliderContainerRef}
                className={styles.timeSliderContainer}
                onPointerDownCapture={() => {
                  if (timeControls.isPlaying()) {
                    // If the slider is dragged while playing, pause playback.
                    timeControls.pause();
                    setIsTimeSliderDraggedDuringPlayback(true);
                  }
                }}
              >
                <Slider
                  min={0}
                  max={dataset ? dataset.numberOfFrames - 1 : 0}
                  disabled={disableTimeControlsUi}
                  value={frameInput}
                  onChange={(value) => {
                    setFrameInput(value);
                  }}
                />
              </div>

              <IconButton
                disabled={disableTimeControlsUi}
                onClick={() => timeControls.advanceFrame(-1)}
                type="outlined"
              >
                <StepBackwardFilled />
              </IconButton>
              <IconButton disabled={disableTimeControlsUi} onClick={() => timeControls.advanceFrame(1)} type="outlined">
                <StepForwardFilled />
              </IconButton>

              <SpinBox
                min={0}
                max={dataset?.numberOfFrames && dataset?.numberOfFrames - 1}
                value={frameInput}
                onChange={setFrame}
                disabled={disableTimeControlsUi}
                wrapIncrement={true}
              />
              <div style={{ display: "flex", flexDirection: "row", flexGrow: 1, justifyContent: "flex-end" }}>
                <PlaybackSpeedControl
                  fps={playbackFps}
                  onChange={(fps) => {
                    setPlaybackFps(fps);
                    timeControls.setPlaybackFps(fps);
                  }}
                  disabled={disableTimeControlsUi}
                />
              </div>
            </div>
          </div>
          <div className={styles.sidePanels}>
            <div className={styles.plotAndFiltersPanel}>
              <Tabs
                type="card"
                style={{ marginBottom: 0, width: "100%" }}
                size="large"
                activeKey={openTab}
                onChange={(key) => setOpenTab(key as TabType)}
                items={tabItems}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Viewer;
