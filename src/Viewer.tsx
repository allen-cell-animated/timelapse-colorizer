import { EllipsisOutlined } from "@ant-design/icons";
import { notification, Tabs } from "antd";
import type { NotificationConfig } from "antd/es/notification/interface";
import React, {
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import {
  type Dataset,
  LoadTroubleshooting,
  type PixelIdInfo,
  type ReportWarningCallback,
  TabType,
} from "src/colorizer";
import type Collection from "src/colorizer/Collection";
import { FeatureType, TIME_FEATURE_KEY } from "src/colorizer/Dataset";
import UrlArrayLoader from "src/colorizer/loaders/UrlArrayLoader";
import { AnalyticsEvent, triggerAnalyticsEvent } from "src/colorizer/utils/analytics";
import CanvasOverlay from "src/colorizer/viewport/CanvasOverlay";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import { useAlertBanner } from "src/components/Banner";
import { showFailedUrlParseAlert } from "src/components/Banner/alert_templates";
import ShareUrlButton from "src/components/Buttons/ShareUrlButton";
import CanvasWrapper from "src/components/CanvasWrapper";
import ColorizeControls from "src/components/Controls/ColorizeControls";
import DatasetFeatureControls from "src/components/Controls/DatasetFeatureControls";
import PlaybackControls from "src/components/Controls/PlaybackControls";
import HelpDropdown from "src/components/Dropdowns/HelpDropdown";
import Export from "src/components/Export";
import Header from "src/components/Header";
import LoadDatasetButton from "src/components/LoadDatasetButton";
import LoadZipModal from "src/components/LoadZipModal";
import SmallScreenWarning from "src/components/Modals/SmallScreenWarning";
import {
  AnnotationTab,
  CorrelationPlotTab,
  FeatureThresholdsTab,
  PlotTab,
  ScatterPlotTab,
  SettingsTab,
} from "src/components/Tabs";
import CanvasHoverTooltip from "src/components/Tooltips/CanvasHoverTooltip";
import { INTERNAL_BUILD } from "src/constants";
import { useAnnotations, useConstructor, useRecentCollections } from "src/hooks";
import { renderCanvasStateParamsSelector } from "src/state";
import { getDifferingProperties } from "src/state/utils/data_validation";
import {
  loadInitialViewerStateFromParams,
  loadViewerStateFromParams,
  selectSerializationDependencies,
  serializeViewerState,
} from "src/state/utils/store_io";
import { makeDebouncedCallback } from "src/state/utils/store_utils";
import { useViewerStateStore } from "src/state/ViewerState";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexRowAlignCenter } from "src/styles/utils";
import type { LocationState } from "src/types";
import { loadInitialCollectionAndDataset } from "src/utils/dataset_load_utils";

// TODO: Refactor with styled-components
import styles from "./Viewer.module.css";

type TabItem = {
  label: string;
  key: string;
  visible?: boolean;
  children: ReactNode;
};

function Viewer(): ReactElement {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////
  const theme = useContext(AppThemeContext);
  const location = useLocation();

  const [, startTransition] = useTransition();

  const canv = useConstructor((): CanvasOverlay => {
    const stateDeps = renderCanvasStateParamsSelector(useViewerStateStore.getState());
    const canvas = new CanvasOverlay(stateDeps);
    // Report frame load results to the store
    canvas.setOnFrameLoadCallback((result) => {
      useViewerStateStore.getState().setFrameLoadResult(result);
      useViewerStateStore.setState({ currentFrame: result.frame });
    });
    useViewerStateStore.getState().setFrameLoadCallback(async (frame: number) => await canvas.setFrame(frame));
    return canvas;
  }).current;

  // Shared worker pool for background operations (e.g. loading data)
  const workerPool = getSharedWorkerPool();
  const arrayLoader = useConstructor(() => new UrlArrayLoader(workerPool)).current;

  // TODO: Break down into separate components to greatly reduce the state
  // required for this component.
  // Get viewer state:
  const collection = useViewerStateStore((state) => state.collection);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const dataset = useViewerStateStore((state) => state.dataset);
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);
  const openTab = useViewerStateStore((state) => state.openTab);
  const setCollection = useViewerStateStore((state) => state.setCollection);
  const setDataset = useViewerStateStore((state) => state.setDataset);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setScatterXAxis = useViewerStateStore((state) => state.setScatterXAxis);
  const setScatterYAxis = useViewerStateStore((state) => state.setScatterYAxis);
  const setSourceZipName = useViewerStateStore((state) => state.setSourceZipName);
  const sourceZipName = useViewerStateStore((state) => state.sourceZipName);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const [, addRecentCollection] = useRecentCollections();
  const annotationState = useAnnotations();

  // Loading from a local file
  const zipLoadPromiseResolveRef = useRef<((result: Collection | null) => void) | null>(null);
  const [expectedFileLoadDatasetName, setExpectedFileLoadDatasetName] = useState<string | null>(null);
  const [showZipLoadModal, setShowZipLoadModal] = useState(false);
  const isZipUploadPending = zipLoadPromiseResolveRef.current !== null;

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);
  const [datasetLoadProgress, setDatasetLoadProgress] = useState<number | null>(null);
  const [datasetOpen, setDatasetOpen] = useState(false);

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

  const [lastValidHoveredId, setLastValidHoveredId] = useState<PixelIdInfo>({ segId: -1, globalId: undefined });
  const [showObjectHoverInfo, setShowObjectHoverInfo] = useState(false);
  const currentHoveredId = showObjectHoverInfo ? lastValidHoveredId : null;

  // EVENT LISTENERS ////////////////////////////////////////////////////////
  const updateUrlParams = useCallback(
    makeDebouncedCallback(() => {
      if (isInitialDatasetLoaded) {
        const params = serializeViewerState(useViewerStateStore.getState());
        setSearchParams(params as Record<string, string>, { replace: true });
      }
    }),
    [isInitialDatasetLoaded]
  );

  useEffect(() => {
    // Update the URL parameters once after the dataset is loaded for the first time.
    if (isInitialDatasetLoaded) {
      updateUrlParams();
    }
  }, [isInitialDatasetLoaded]);

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
      updateUrlParams();
    });
  }, [isRecording, updateUrlParams]);

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
            setScatterXAxis(TIME_FEATURE_KEY);
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

  const showZipLoadPrompt = useCallback(
    async (filename: string, datasetName: string | null): Promise<Collection | null> => {
      setSourceZipName(filename);
      setShowZipLoadModal(true);
      setExpectedFileLoadDatasetName(datasetName);
      const collectionPromise = new Promise<Collection | null>((resolve) => {
        zipLoadPromiseResolveRef.current = resolve;
      });
      return collectionPromise;
    },
    [setSourceZipName, setShowZipLoadModal, setExpectedFileLoadDatasetName]
  );

  const onLoadedZipCollection = useCallback(
    (collection: Collection) => {
      zipLoadPromiseResolveRef.current?.(collection);
      setTimeout(() => setShowZipLoadModal(false), 500);
    },
    [setShowZipLoadModal]
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

      loadInitialViewerStateFromParams(useViewerStateStore, searchParams);

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
        promptForFileLoad: showZipLoadPrompt,
      });

      if (!result) {
        setIsDatasetLoading(false);
        return;
      }

      const { collection: newCollection, dataset: newDataset, datasetKey: newDatasetKey } = result;
      setCollection(newCollection);

      // Collection URL will be `null` if the dataset was loaded from a local
      // ZIP file.
      const collectionUrl = newCollection.getUrl();
      if (collectionUrl !== null) {
        addRecentCollection({ url: collectionUrl });
      }

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
  }, [showZipLoadPrompt]);

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
      if (newCollection !== collection && collection !== null) {
        collection.dispose();
      }
    },
    [replaceDataset, collection]
  );

  const onClickId = useCallback(
    // `info` is null if the user clicked on a background pixel. Otherwise, it
    // contains the segmentation ID (raw image pixel value) and the global ID.
    // The global ID is undefined if the object does not exist in the dataset.
    (info: PixelIdInfo | null) => {
      if (dataset) {
        // Pass null if the user clicked on something non-interactive
        // (background or a non-existent object).
        annotationState.handleAnnotationClick(dataset, info?.globalId ?? null);
      }
    },
    [dataset, annotationState.handleAnnotationClick]
  );

  const onClickExport = useCallback((): void => {
    // Stop playback when exporting.
    timeControls.pause();
  }, [timeControls]);

  // RENDERING /////////////////////////////////////////////////////////////

  const disableUi: boolean = isRecording || !datasetOpen;

  const allTabItems: TabItem[] = [
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
      children: (
        <div className={styles.tabContent}>
          <AnnotationTab annotationState={annotationState} hoveredId={currentHoveredId?.globalId ?? null} />
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
  const visibleTabKeys = useMemo(() => new Set(tabItems.map((item) => item.key)), [INTERNAL_BUILD]);
  const currentTab = visibleTabKeys.has(openTab) ? openTab : TabType.TRACK_PLOT;

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
            <div>
              <LoadDatasetButton
                onLoad={handleDatasetLoad}
                currentResourceUrl={collection?.sourcePath ?? datasetKey ?? ""}
                reportWarning={showDatasetLoadWarning}
                annotationState={annotationState}
              />
              <LoadZipModal
                sourceZipName={sourceZipName ?? ""}
                onLoad={onLoadedZipCollection}
                open={showZipLoadModal}
                targetDataset={expectedFileLoadDatasetName}
                onClose={() => {
                  setShowZipLoadModal(false);
                  zipLoadPromiseResolveRef.current?.(null);
                }}
              />
            </div>
            <Export
              totalFrames={dataset?.numberOfFrames || 0}
              setFrame={setFrame}
              canvas={canv}
              onClick={onClickExport}
              currentFrame={currentFrame}
              defaultImagePrefix={datasetKey + "-" + featureKey}
              disabled={dataset === null}
              setIsRecording={setIsRecording}
            />
            <ShareUrlButton notificationApi={notificationApi} />
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>

      {/** Main Content: Contains canvas and plot, ramp controls, time controls, etc. */}
      <div className={styles.mainContent}>
        {/* Organize the main content areas */}
        <div className={styles.contentPanels}>
          {/** Canvas + Controls + Playback*/}
          <div className={styles.canvasPanel}>
            {/** Top Control Bar */}
            <FlexColumn $gap={16} style={{ marginBottom: 23, width: "100%" }}>
              <DatasetFeatureControls
                onSelectDataset={handleDatasetChange}
                onSelectFeature={reportFeatureSelected}
                disabled={disableUi}
                annotationState={annotationState}
              />
              <ColorizeControls disabled={disableUi} />
            </FlexColumn>

            <CanvasHoverTooltip
              lastValidHoveredId={lastValidHoveredId}
              showObjectHoverInfo={showObjectHoverInfo}
              annotationState={annotationState}
            >
              <CanvasWrapper
                // Disable loading spinner when file upload is pending
                loading={isDatasetLoading && !isZipUploadPending}
                loadingProgress={datasetLoadProgress}
                canv={canv}
                isRecording={isRecording}
                onClickId={onClickId}
                onMouseHover={(info: PixelIdInfo | null): void => {
                  const isObject = info !== null;
                  setShowObjectHoverInfo(isObject);
                  if (isObject) {
                    setLastValidHoveredId(info);
                  }
                }}
                onMouseLeave={() => setShowObjectHoverInfo(false)}
                showAlert={showAlert}
                annotationState={annotationState}
              />
            </CanvasHoverTooltip>

            <div className={styles.timeControls}>
              <PlaybackControls disabled={disableUi} />
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.sidePanels}>
            <div className={styles.plotAndFiltersPanel}>
              <Tabs
                type="card"
                style={{ marginBottom: 0, width: "100%" }}
                size="large"
                activeKey={currentTab}
                onChange={(key) => setOpenTab(key as TabType)}
                items={tabItems}
                moreIcon={<EllipsisOutlined style={{ fontSize: theme.font.size.section }} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Viewer;
