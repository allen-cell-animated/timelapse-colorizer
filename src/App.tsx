import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  CaretRightOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  PauseOutlined,
  SearchOutlined,
  StepBackwardFilled,
  StepForwardFilled,
} from "@ant-design/icons";
import { Button, Checkbox, Divider, Input, Slider, notification } from "antd";
import { NotificationConfig } from "antd/es/notification/interface";
import { Color } from "three";

import styles from "./App.module.css";
import { ColorizeCanvas, Dataset, Track } from "./colorizer";
import Collection from "./colorizer/Collection";
import { BACKGROUND_ID, DrawMode, OUTLIER_COLOR_DEFAULT, OUT_OF_RANGE_COLOR_DEFAULT } from "./colorizer/ColorizeCanvas";
import TimeControls from "./colorizer/TimeControls";
import { useConstructor, useDebounce } from "./colorizer/utils/react_utils";
import * as urlUtils from "./colorizer/utils/url_utils";
import AppStyle, { AppThemeContext } from "./components/AppStyle";
import ColorRampDropdown from "./components/ColorRampDropdown";
import LabeledDropdown from "./components/LabeledDropdown";
import LoadDatasetButton from "./components/LoadDatasetButton";
import { DEFAULT_COLLECTION_PATH, DEFAULT_COLOR_RAMPS, DEFAULT_COLOR_RAMP_ID, DEFAULT_PLAYBACK_FPS } from "./constants";
import IconButton from "./components/IconButton";
import SpinBox from "./components/SpinBox";
import HoverTooltip from "./components/HoverTooltip";
import Export from "./components/Export";
import DrawModeDropdown from "./components/DrawModeDropdown";
import CanvasWrapper from "./components/CanvasWrapper";
import LabeledRangeSlider from "./components/LabeledRangeSlider";
import PlotWrapper from "./components/PlotWrapper";
import PlaybackSpeedControl from "./components/PlaybackSpeedControl";

function App(): ReactElement {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////
  const theme = useContext(AppThemeContext);

  const canv = useConstructor(() => {
    return new ColorizeCanvas();
  });

  const [collection, setCollection] = useState<Collection | undefined>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetKey, setDatasetKey] = useState("");

  const [featureName, setFeatureName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);

  const colorRampData = DEFAULT_COLOR_RAMPS;
  const [colorRampKey, setColorRampKey] = useState(DEFAULT_COLOR_RAMP_ID);
  const [colorRampMin, setColorRampMin] = useState(0);
  const [colorRampMax, setColorRampMax] = useState(0);
  const [outOfRangeDrawSettings, setoutOfRangeDrawSettings] = useState({
    mode: DrawMode.USE_RAMP,
    color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
  });
  const [outlierDrawSettings, setOutlierDrawSettings] = useState({
    mode: DrawMode.USE_COLOR,
    color: new Color(OUTLIER_COLOR_DEFAULT),
  });
  const [playbackFps, setPlaybackFps] = useState(DEFAULT_PLAYBACK_FPS);

  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);

  // Provides a mounting point for Antd's notification component. Otherwise, the notifications
  // are mounted outside of App and don't receive CSS styling variables.
  const notificationContainer = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const timeControls = useConstructor(() => new TimeControls(canv!, playbackFps));

  /** The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);
  const [findTrackInput, setFindTrackInput] = useState("");
  // Prevent jarring jumps in the hover tooltip by using the last non-null value
  const [lastHoveredId, setLastHoveredId] = useState<number | null>(null);
  const [showHoveredId, setShowHoveredId] = useState(false);

  // UTILITY METHODS /////////////////////////////////////////////////////////////

  /**
   * Get a set of URL parameters that represent the current collection, dataset, feature, track,
   * and frame information. (Convenience wrapper for `urlUtils.getUrlParams`.)
   */
  const getUrlParams = useCallback((): string => {
    let datasetParam: string | undefined = datasetKey;
    if (!collection?.url) {
      // The collection has no source file; use the dataset URL instead
      datasetParam = dataset?.manifestUrl;
    }
    return urlUtils.stateToUrlParamString({
      collection: collection?.url,
      dataset: datasetParam,
      feature: featureName,
      track: selectedTrack?.trackId,
      time: currentFrame,
    });
  }, [collection, datasetKey, dataset, featureName, selectedTrack, currentFrame]);

  // Update url whenever the viewer settings change
  // (but not while playing/recording for performance reasons)
  useEffect(() => {
    if (!timeControls.isPlaying() && !isRecording) {
      urlUtils.updateUrl(getUrlParams());
    }
  }, [timeControls.isPlaying(), isRecording, getUrlParams]);

  const setFrame = useCallback(
    async (frame: number) => {
      await canv.setFrame(frame);
      setCurrentFrame(frame);
      setFrameInput(frame);
    },
    [canv]
  );

  const findTrack = useCallback(
    (trackId: number, seekToFrame: boolean = true): void => {
      const newTrack = dataset!.buildTrack(trackId);

      if (newTrack.length() < 1) {
        // Check track validity
        return;
      }
      setSelectedTrack(newTrack);
      if (seekToFrame) {
        setFrame(newTrack.times[0]);
      }
      setFindTrackInput("" + trackId);
    },
    [canv, dataset, featureName, currentFrame]
  );

  // INITIAL SETUP  ////////////////////////////////////////////////////////////////

  // Only retrieve parameters once, because the URL can be updated by state updates
  // and lose information (like the track, feature, time, etc.) that isn't
  // accessed in the first render.
  const initialUrlParams = useConstructor(() => {
    return urlUtils.loadParamsFromUrl();
  });

  // Attempt to load database and collections data from the URL.
  // This is memoized so that it only runs one time on startup.
  useEffect(() => {
    const loadInitialDatabase = async (): Promise<void> => {
      let newCollection: Collection;
      const collectionUrlParam = initialUrlParams.collection;
      const datasetParam = initialUrlParams.dataset;
      let datasetKey: string;

      if (datasetParam && urlUtils.isUrl(datasetParam) && !collectionUrlParam) {
        // Dataset is a URL and no collection URL is provided;
        // Make a dummy collection that will include only this dataset
        newCollection = Collection.makeCollectionFromSingleDataset(datasetParam);
        datasetKey = newCollection.getDefaultDatasetKey();
      } else {
        // Try loading the collection, with the default collection as a fallback.
        newCollection = await Collection.loadCollection(collectionUrlParam || DEFAULT_COLLECTION_PATH);
        datasetKey = datasetParam || newCollection.getDefaultDatasetKey();
      }

      setCollection(newCollection);
      const datasetResult = await newCollection.tryLoadDataset(datasetKey);

      // TODO: The new dataset may be null if loading failed. See TODO in replaceDataset about expected behavior.
      await replaceDataset(datasetResult.dataset, datasetKey);
      setIsInitialDatasetLoaded(true);
      return;
    };
    loadInitialDatabase();
  }, []);

  // Load additional properties from the URL, including the time, track, and feature, once the first
  // dataset has been loaded. Runs only once.
  useEffect(() => {
    if (!isInitialDatasetLoaded) {
      return;
    }
    const setupInitialParameters = async (): Promise<void> => {
      if (initialUrlParams.feature && dataset) {
        // Load feature (if unset, do nothing because replaceDataset already loads a default)
        await updateFeature(dataset, initialUrlParams.feature);
      }
      if (initialUrlParams.track >= 0) {
        // Highlight the track. Seek to start of frame only if time is not defined.
        await findTrack(initialUrlParams.track, initialUrlParams.time < 0);
      }
      let newTime = currentFrame;
      if (initialUrlParams.time >= 0) {
        // Load time (if unset, defaults to track time or default t=0)
        newTime = initialUrlParams.time;
        await canv.setFrame(newTime);
        setCurrentFrame(newTime); // Force render
        setFrameInput(newTime);
      }
    };

    setupInitialParameters();
  }, [isInitialDatasetLoaded]);

  // DATASET LOADING ///////////////////////////////////////////////////////
  /**
   * Replaces the current dataset with another loaded dataset. Handles cleanup and state changes.
   * @param newDataset the new Dataset to replace the existing with. If null, does nothing.
   * @param newDatasetKey the key of the new dataset in the Collection.
   * @returns a Promise<void> that resolves when the loading is complete.
   */
  const replaceDataset = useCallback(
    async (newDataset: Dataset | null, newDatasetKey: string): Promise<void> => {
      // TODO: Change the way flags are handled to prevent flickering during dataset replacement
      setDatasetOpen(false);
      if (newDataset === null) {
        // TODO: Determine with UX what expected behavior should be for bad datasets
        return;
      }

      // Dispose of the old dataset
      if (dataset !== null) {
        dataset.dispose();
      }
      // State updates
      setDataset(newDataset);
      setDatasetKey(newDatasetKey);

      // Only change the feature if there's no equivalent in the new dataset
      let newFeatureName = featureName;
      if (!newDataset.hasFeature(newFeatureName)) {
        newFeatureName = newDataset.featureNames[0];
      }
      updateFeature(newDataset, newFeatureName);
      setFeatureName(newFeatureName);

      await canv.setDataset(newDataset);
      canv.setFeature(newFeatureName);

      // Clamp frame to new range
      const newFrame = Math.min(currentFrame, canv.getTotalFrames() - 1);
      await setFrame(newFrame);

      setFindTrackInput("");
      setSelectedTrack(null);
      setDatasetOpen(true);
    },
    [dataset, featureName, canv, currentFrame, getUrlParams]
  );

  // DISPLAY CONTROLS //////////////////////////////////////////////////////
  const handleDatasetChange = useCallback(
    async (newDatasetKey: string): Promise<void> => {
      if (newDatasetKey !== datasetKey && collection) {
        const result = await collection.tryLoadDataset(newDatasetKey);
        if (result.loaded) {
          await replaceDataset(result.dataset, newDatasetKey);
        } else {
          // TODO: What happens when you try to load a bad dataset from the dropdown? Notifications?
          console.error(result.errorMessage);
        }
      }
    },
    [replaceDataset, collection, datasetKey]
  );

  /**
   * Attempt to load an ambiguous URL as either a dataset or a collection.
   * @param url the url to load.
   * @returns a LoadResult, which includes a `result` boolean flag (true if successful, false if not)
   * and an optional `errorMessage`.
   */
  const handleLoadRequest = useCallback(
    async (url: string): Promise<void> => {
      console.log("Loading '" + url + "'.");
      const newCollection = await Collection.loadFromAmbiguousUrl(url);
      const newDatasetKey = newCollection.getDefaultDatasetKey();
      const loadResult = await newCollection.tryLoadDataset(newDatasetKey);
      if (!loadResult.loaded) {
        const errorMessage = loadResult.errorMessage;

        if (errorMessage) {
          // Remove 'Error:' prefixes
          const matches = errorMessage.replace(/^(Error:)*/, "");
          // Reject the promise with the error message
          throw new Error(matches);
          // throw new Error(errorMessage);
        } else {
          throw new Error();
        }
      }

      setCollection(newCollection);
      await replaceDataset(loadResult.dataset, newDatasetKey);
    },
    [replaceDataset]
  );

  const updateFeature = useCallback(
    async (newDataset: Dataset, newFeatureName: string): Promise<void> => {
      if (!newDataset?.hasFeature(newFeatureName)) {
        console.warn("Dataset does not have feature '" + newFeatureName + "'.");
        return;
      }
      setFeatureName(newFeatureName);

      const featureData = newDataset.getFeatureData(newFeatureName);
      if (!isColorRampRangeLocked && featureData) {
        setColorRampMin(featureData.min);
        setColorRampMax(featureData.max);
      }

      canv.setFeature(newFeatureName);
    },
    [isColorRampRangeLocked, colorRampMin, colorRampMax, canv, selectedTrack, currentFrame]
  );

  const getFeatureValue = useCallback(
    (id: number): number => {
      if (!featureName || !dataset) {
        return -1;
      }
      // Look up feature value from id
      return dataset.getFeatureData(featureName)?.data[id] || -1;
    },
    [featureName, dataset]
  );

  // SCRUBBING CONTROLS ////////////////////////////////////////////////////
  timeControls.setFrameCallback(setFrame);

  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent): void => {
      if (key === "ArrowLeft" || key === "Left") {
        timeControls.handleFrameAdvance(-1);
      } else if (key === "ArrowRight" || key === "Right") {
        timeControls.handleFrameAdvance(1);
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
    setFrame(debouncedFrameInput);
  }, [debouncedFrameInput]);

  // RECORDING CONTROLS ////////////////////////////////////////////////////

  // Update the callback for TimeControls and RecordingControls if it changes.
  // TODO: TimeControls and RecordingControls should be refactored into components
  // and receive setFrame as props.
  timeControls.setFrameCallback(setFrame);

  const setFrameAndRender = useCallback(
    async (frame: number) => {
      await setFrame(frame);
      canv.render();
    },
    [setFrame, canv]
  );

  // RENDERING /////////////////////////////////////////////////////////////

  const notificationConfig: NotificationConfig = {
    getContainer: () => notificationContainer.current as HTMLElement,
  };
  const [notificationApi, notificationContextHolder] = notification.useNotification(notificationConfig);
  const openCopyNotification = (): void => {
    navigator.clipboard.writeText(document.URL);
    notificationApi["success"]({
      message: "URL copied to clipboard",
      placement: "bottomLeft",
      duration: 4,
      icon: <CheckCircleOutlined style={{ color: theme.color.text.success }} />,
    });
  };

  const disableUi: boolean = isRecording || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  return (
    <AppStyle className={styles.app}>
      <div ref={notificationContainer}>{notificationContextHolder}</div>

      {/* Header bar: Contains dataset, feature, color ramp, and other top-level functionality. */}
      {/* TODO: Split into its own component? */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Timelapse Colorizer</h1>
          <span className={styles.verticalDivider}></span>

          <LabeledDropdown
            disabled={disableUi}
            label="Dataset"
            selected={datasetKey}
            buttonType="primary"
            items={collection?.getDatasetKeys() || []}
            onChange={handleDatasetChange}
          />
          <LabeledDropdown
            disabled={disableUi}
            label="Feature"
            selected={featureName}
            items={dataset?.featureNames || []}
            onChange={(value) => {
              if (value !== featureName && dataset) {
                updateFeature(dataset, value);
              }
            }}
          />

          <ColorRampDropdown selected={colorRampKey} onChange={(name) => setColorRampKey(name)} disabled={disableUi} />
        </div>
        <div className={styles.headerRight}>
          <Button type="link" className={styles.copyUrlButton} onClick={openCopyNotification}>
            <LinkOutlined />
            Copy URL
          </Button>
          <Export
            totalFrames={dataset?.numberOfFrames || 0}
            setFrame={setFrameAndRender}
            getCanvas={() => {
              return canv.domElement;
            }}
            // Stop playback when exporting
            onClick={() => timeControls.handlePauseButtonClick()}
            currentFrame={currentFrame}
            defaultImagePrefix={datasetKey + "-" + featureName}
            disabled={dataset === null}
            setIsRecording={setIsRecording}
          />
          <LoadDatasetButton onRequestLoad={handleLoadRequest} />
        </div>
      </div>

      {/** Main Content: Contains canvas and plot, ramp controls, time controls, etc. */}
      <div className={styles.mainContent}>
        {/** Top Control Bar */}
        <div className={styles.topControls}>
          <h3 style={{ margin: "0" }}>Feature value range</h3>
          <div className={styles.controlsContainer}>
            <LabeledRangeSlider
              min={colorRampMin}
              max={colorRampMax}
              minSliderBound={dataset?.getFeatureData(featureName)?.min}
              maxSliderBound={dataset?.getFeatureData(featureName)?.max}
              onChange={function (min: number, max: number): void {
                setColorRampMin(min);
                setColorRampMax(max);
              }}
              disabled={disableUi}
            />
            <div>
              <Checkbox
                checked={isColorRampRangeLocked}
                onChange={() => {
                  // Invert lock on range
                  setIsColorRampRangeLocked(!isColorRampRangeLocked);
                }}
              >
                Keep range between datasets
              </Checkbox>
            </div>
          </div>
        </div>

        {/* Organize the main content areas */}
        <div className={styles.contentPanels}>
          <div className={styles.canvasPanel}>
            {/** Canvas */}
            <HoverTooltip
              tooltipContent={
                <>
                  <p>Track ID: {lastHoveredId && dataset?.getTrackId(lastHoveredId)}</p>
                  <p>Feature: {lastHoveredId && getFeatureValue(lastHoveredId)}</p>
                </>
              }
              disabled={!showHoveredId}
            >
              <CanvasWrapper
                canv={canv}
                dataset={dataset}
                showTrackPath={showTrackPath}
                outOfRangeDrawSettings={outOfRangeDrawSettings}
                outlierDrawSettings={outlierDrawSettings}
                colorRamp={colorRampData.get(colorRampKey)?.colorRamp!}
                colorRampMin={colorRampMin}
                colorRampMax={colorRampMax}
                selectedTrack={selectedTrack}
                onTrackClicked={(track) => {
                  setFindTrackInput("");
                  setSelectedTrack(track);
                }}
                onMouseHover={(id: number): void => {
                  const isObject = id !== BACKGROUND_ID;
                  setShowHoveredId(isObject);
                  if (isObject) {
                    setLastHoveredId(id);
                  }
                }}
                onMouseLeave={() => setShowHoveredId(false)}
              />
            </HoverTooltip>

            {/** Time Control Bar */}
            <div className={styles.timeControls}>
              {timeControls.isPlaying() ? (
                // Swap between play and pause button
                <IconButton
                  type="outlined"
                  disabled={disableTimeControlsUi}
                  onClick={() => timeControls.handlePauseButtonClick()}
                >
                  <PauseOutlined />
                </IconButton>
              ) : (
                <IconButton
                  disabled={disableTimeControlsUi}
                  onClick={() => timeControls.handlePlayButtonClick()}
                  type="outlined"
                >
                  <CaretRightOutlined />
                </IconButton>
              )}

              <div className={styles.timeSliderContainer}>
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
                onClick={() => timeControls.handleFrameAdvance(-1)}
                type="outlined"
              >
                <StepBackwardFilled />
              </IconButton>
              <IconButton
                disabled={disableTimeControlsUi}
                onClick={() => timeControls.handleFrameAdvance(1)}
                type="outlined"
              >
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
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <span className={styles.verticalDivider} style={{ height: "24px", margin: "0 8px" }}></span>
                <div style={{ width: "200px", maxWidth: "60vw" }}>
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
          </div>

          <div className={styles.plotPanel}>
            <Divider orientationMargin={0} />
            <div>
              <div className={styles.trackTitleBar}>
                <h2>Plot</h2>

                <div className={styles.trackSearch}>
                  <h3>Search</h3>
                  <Input
                    type="number"
                    value={findTrackInput}
                    size="small"
                    placeholder="Track ID..."
                    disabled={disableUi}
                    onChange={(event) => {
                      setFindTrackInput(event.target.value);
                    }}
                  />
                  <IconButton
                    disabled={disableUi}
                    onClick={async () => {
                      await findTrack(parseInt(findTrackInput, 10));
                    }}
                  >
                    <SearchOutlined />
                  </IconButton>
                </div>
              </div>
              <PlotWrapper
                frame={currentFrame}
                dataset={dataset}
                featureName={featureName}
                selectedTrack={selectedTrack}
              />
            </div>
            <Divider orientationMargin={0} />
            <div>
              <h2>Viewer settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <DrawModeDropdown
                  label="Values outside of range"
                  selected={outOfRangeDrawSettings.mode}
                  color={outOfRangeDrawSettings.color}
                  onChange={(mode: DrawMode, color: Color) => {
                    setoutOfRangeDrawSettings({ mode, color });
                  }}
                />
                <DrawModeDropdown
                  label="Outliers"
                  selected={outlierDrawSettings.mode}
                  color={outlierDrawSettings.color}
                  onChange={(mode: DrawMode, color: Color) => {
                    setOutlierDrawSettings({ mode, color });
                  }}
                />
                <Checkbox
                  type="checkbox"
                  checked={showTrackPath}
                  onChange={() => {
                    setShowTrackPath(!showTrackPath);
                  }}
                >
                  Show track path
                </Checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppStyle>
  );
}

export default App;
