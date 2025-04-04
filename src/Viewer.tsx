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
import { Link, useLocation, useSearchParams } from "react-router-dom";

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
import { showFailedUrlParseAlert } from "./components/Banner/alert_templates";
import { SelectItem } from "./components/Dropdowns/types";
import { SCATTERPLOT_TIME_FEATURE } from "./components/Tabs/scatter_plot_data_utils";
import { DEFAULT_PLAYBACK_FPS, INTERNAL_BUILD } from "./constants";
import { getDifferingProperties } from "./state/utils/data_validation";
import {
  loadViewerStateFromParams,
  selectSerializationDependencies,
  serializeViewerState,
} from "./state/utils/store_io";
import { makeDebouncedCallback } from "./state/utils/store_utils";
import { FlexRow, FlexRowAlignCenter } from "./styles/utils";
import { LocationState } from "./types";
import { loadInitialCollectionAndDataset } from "./utils/dataset_load_utils";

import CanvasOverlay from "./colorizer/CanvasOverlay";
import Collection from "./colorizer/Collection";
import ColorizeCanvas2D, { BACKGROUND_ID } from "./colorizer/ColorizeCanvas2D";
import { ColorizeCanvas3D } from "./colorizer/ColorizeCanvas3D";
import { FeatureType } from "./colorizer/Dataset";
import { renderCanvasStateParamsSelector } from "./colorizer/IRenderCanvas";
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

  const canv: CanvasOverlay = useConstructor(() => {
    const stateDeps = renderCanvasStateParamsSelector(useViewerStateStore.getState());
    // TODO: Once Datasets can report whether they are 2D or 3D, CanvasOverlay
    // should construct and swap between the two types of canvases on its own.
    const use3DCanvas = true;
    const innerCanvas = use3DCanvas ? new ColorizeCanvas3D(stateDeps) : new ColorizeCanvas2D();
    const canvas = new CanvasOverlay(innerCanvas, stateDeps);
    canvas.domElement.className = styles.colorizeCanvas;
    // Report frame load results to the store
    canvas.setOnFrameLoadCallback(useViewerStateStore.getState().setFrameLoadResult);
    useViewerStateStore.getState().setFrameLoadCallback(async (frame: number) => await canvas.setFrame(frame));
    return canvas;
  });

  // Shared worker pool for background operations (e.g. loading data)
  const workerPool = getSharedWorkerPool();
  const arrayLoader = useConstructor(() => new UrlArrayLoader(workerPool));

  // TODO: Refactor dataset dropdowns, color ramp controls, and time controls into separate
  // components to greatly reduce the state required for this component.
  // Get viewer state:
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const categoricalPalette = useViewerStateStore((state) => state.categoricalPalette);
  const collection = useViewerStateStore((state) => state.collection);
  const colorRampKey = useViewerStateStore((state) => state.colorRampKey);
  const colorRampReversed = useViewerStateStore((state) => state.isColorRampReversed);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const dataset = useViewerStateStore((state) => state.dataset);
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);
  const keepColorRampRange = useViewerStateStore((state) => state.keepColorRampRange);
  const openTab = useViewerStateStore((state) => state.openTab);
  const selectedPaletteKey = useViewerStateStore((state) => state.categoricalPaletteKey);
  const setCategoricalPalette = useViewerStateStore((state) => state.setCategoricalPalette);
  const setCollection = useViewerStateStore((state) => state.setCollection);
  const setColorRampKey = useViewerStateStore((state) => state.setColorRampKey);
  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);
  const setColorRampReversed = useViewerStateStore((state) => state.setColorRampReversed);
  const setDataset = useViewerStateStore((state) => state.setDataset);
  const setFeatureKey = useViewerStateStore((state) => state.setFeatureKey);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const setKeepColorRampRange = useViewerStateStore((state) => state.setKeepColorRampRange);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setScatterXAxis = useViewerStateStore((state) => state.setScatterXAxis);
  const setScatterYAxis = useViewerStateStore((state) => state.setScatterYAxis);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey);
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];
  const featureNameWithUnits = isFeatureSelected ? dataset.getFeatureNameWithUnits(featureKey) : undefined;

  const [, addRecentCollection] = useRecentCollections();
  const annotationState = useAnnotations();

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);
  const [datasetLoadProgress, setDatasetLoadProgress] = useState<number | null>(null);
  const [datasetOpen, setDatasetOpen] = useState(false);

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

  // TODO: Move all logic for the time slider into its own component!
  // Flag indicating that frameInput should not be synced with playback.
  const [isUserDirectlyControllingFrameInput, setIsUserDirectlyControllingFrameInput] = useState(false);

  useEffect(() => {
    if (timeControls.isPlaying()) {
      setIsUserDirectlyControllingFrameInput(false);
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
  const updateUrlParams = useCallback(
    // TODO: Update types for makeDebouncedCallback since right now it requires
    // an argument (even if it's a dummy one) to be passed to the callback.
    makeDebouncedCallback(() => {
      if (isInitialDatasetLoaded) {
        const params = serializeViewerState(useViewerStateStore.getState());
        setSearchParams(params, { replace: true });
      }
    }),
    [isInitialDatasetLoaded]
  );

  useEffect(() => {
    return useViewerStateStore.subscribe(selectSerializationDependencies, (state, prevState) => {
      // Ignore changes to the current frame during playback.
      const differingKeys = getDifferingProperties(state, prevState);
      const hasOnlyTimeChanged = differingKeys.size === 1 && differingKeys.has("currentFrame");

      if (
        differingKeys.size === 0 ||
        (hasOnlyTimeChanged && useViewerStateStore.getState().timeControls.isPlaying()) ||
        isRecording
      ) {
        return;
      }
      updateUrlParams(state);
    });
  }, [isRecording, updateUrlParams]);

  // Sync the time slider with the pending frame.
  useEffect(() => {
    // When user is controlling time slider, do not sync frame input w/ playback
    if (!isUserDirectlyControllingFrameInput) {
      return useViewerStateStore.subscribe((state) => state.pendingFrame, setFrameInput);
    }
    return;
  }, [isUserDirectlyControllingFrameInput]);

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

  const showMissingDatasetAlert = useCallback(() => {
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
  }, [showAlert]);

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

      setDatasetOpen(true);
      console.log("Dataset metadata:", newDataset.metadata);
      console.log("Num Items:" + newDataset?.numObjects);
    },
    [dataset, featureKey, canv, currentFrame, featureThresholds]
  );

  // INITIAL SETUP  ////////////////////////////////////////////////////////////////

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
      setDatasetLoadProgress(null);
      isLoadingInitialDataset.current = true;
      // Location can include a Collection object and a datasetKey to be loaded.
      const locationState = location.state as Partial<LocationState>;

      const result = await loadInitialCollectionAndDataset(searchParams, locationState, {
        arrayLoader,
        onLoadProgress: handleProgressUpdate,
        reportWarning: showDatasetLoadWarning,
        reportLoadError: showDatasetLoadError,
        reportMissingDataset: showMissingDatasetAlert,
      });

      if (!result) {
        setIsDatasetLoading(false);
        return;
      }

      const { collection: newCollection, dataset: newDataset, datasetKey: newDatasetKey } = result;
      setCollection(newCollection);
      addRecentCollection({ url: newCollection.getUrl() });
      await replaceDataset(newDataset, newDatasetKey);
      setIsInitialDatasetLoaded(true);
      setIsDatasetLoading(false);

      // Load the viewer state from the URL after the dataset is loaded.
      try {
        loadViewerStateFromParams(useViewerStateStore, searchParams);
      } catch (error) {
        console.error("Failed to load viewer state from URL:", error);
        showAlert(showFailedUrlParseAlert(window.location.href, error as Error));
      }
      return;
    };
    loadInitialDataset();
  }, []);

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
        await setFrame(frameInput);
      }
      if (isUserDirectlyControllingFrameInput) {
        setFrame(frameInput).then(() => timeControls.play());
        // Update the frame and unpause playback when the slider is released.
        setIsUserDirectlyControllingFrameInput(false);
      }
    };

    document.addEventListener("pointerup", checkIfPlaybackShouldUnpause);
    return () => {
      document.removeEventListener("pointerup", checkIfPlaybackShouldUnpause);
    };
  }, [isUserDirectlyControllingFrameInput, frameInput]);

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
              getCanvas={() => canv.canvas}
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
                  showAlert={showAlert}
                  annotationState={annotationState}
                />
              </CanvasHoverTooltip>
            </div>

            {/** Time Control Bar */}
            <div className={styles.timeControls}>
              {timeControls.isPlaying() || isUserDirectlyControllingFrameInput ? (
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
                    setIsUserDirectlyControllingFrameInput(true);
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
