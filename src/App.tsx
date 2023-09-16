import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";

import {
  CheckCircleOutlined,
  LinkOutlined,
  PauseOutlined,
  SearchOutlined,
  StepBackwardFilled,
  StepForwardFilled,
} from "@ant-design/icons";
import { Button, Checkbox, Divider, Input, InputNumber, Slider, notification } from "antd";
import { NotificationConfig } from "antd/es/notification/interface";

import styles from "./App.module.css";
import { ColorizeCanvas, Dataset, Plotting, Track } from "./colorizer";
import Collection from "./colorizer/Collection";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";
import RecordingControls from "./colorizer/RecordingControls";
import TimeControls from "./colorizer/TimeControls";
import { useConstructor, useDebounce } from "./colorizer/utils/react_utils";
import * as urlUtils from "./colorizer/utils/url_utils";
import AppStyle from "./components/AppStyle";
import ColorRampSelector from "./components/ColorRampSelector";
import LabeledDropdown from "./components/LabeledDropdown";
import LoadDatasetButton from "./components/LoadDatasetButton";
import { DEFAULT_COLLECTION_PATH, DEFAULT_COLOR_RAMPS, DEFAULT_COLOR_RAMP_ID } from "./constants";
import IconButton from "./components/IconButton";
import SpinBox from "./components/SpinBox";

function App(): ReactElement {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////

  const canvasRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const [plot, setPlot] = useState<Plotting | null>(null);
  const canv = useConstructor(() => {
    return new ColorizeCanvas();
  });

  // Setup for plot + canvas after initial render, since they replace DOM elements.
  useEffect(() => {
    setPlot(new Plotting(plotRef.current!));
    canvasRef.current?.parentNode?.replaceChild(canv.domElement, canvasRef.current);
  }, []);

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
  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [hideValuesOutOfRange, setHideValuesOutOfRange] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);

  // Provides a mounting point for Antd's notification component. Otherwise, the notifications
  // are mounted outside of App and don't receive CSS styling variables.
  const notificationContainer = useRef<HTMLDivElement>(null);

  const timeControls = useConstructor(() => {
    return new TimeControls(canv!);
  });
  const recordingControls = useConstructor(() => {
    return new RecordingControls(canv);
  });

  // Recording UI
  // const [imagePrefix, setImagePrefix] = useState<null | string>(null);
  // const [startAtFirstFrame, setStartAtFirstFrame] = useState(false);
  /** The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);
  const [findTrackInput, setFindTrackInput] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
  }, [collection, datasetKey, featureName, selectedTrack, currentFrame]);

  /**
   * Handle updating the canvas from state (for some common properties) and initiating the canvas
   * render. Also update other UI elements, including the plot and URL.
   */
  useEffect(() => {
    // Note: Selected track, frame number, etc. are not updated here.
    // Those operations are async, and need to complete before a state update to be
    // rendered correctly.
    canv.setShowTrackPath(showTrackPath);
    canv.setHideValuesOutOfRange(hideValuesOutOfRange);
    canv.setColorRamp(colorRampData.get(colorRampKey)?.colorRamp!); // TODO: Add fallback?
    canv.setColorMapRangeMin(colorRampMin);
    canv.setColorMapRangeMax(colorRampMax);
    canv.setSelectedTrack(selectedTrack);
    canv.render();

    // update current time in plot
    plot?.setTime(currentFrame);

    if (!timeControls.isPlaying() && !recordingControls.isRecording()) {
      // Do not update URL while playback is happening for performance + UX reasons
      urlUtils.updateUrl(getUrlParams());
    }
  }, [
    collection,
    dataset,
    datasetKey,
    featureName,
    currentFrame,
    selectedTrack,
    hideValuesOutOfRange,
    showTrackPath,
    colorRampData,
    colorRampKey,
    colorRampMin,
    colorRampMax,
    timeControls.isPlaying(), // updates URL when timeControls stops
    getUrlParams,
  ]);

  const setFrame = useCallback(
    async (frame: number) => {
      await canv.setFrame(frame);
      setCurrentFrame(frame);
      setFrameInput(frame);
    },
    [canv]
  );

  const findTrack = useCallback(
    async (trackId: number, seekToFrame: boolean = true): Promise<void> => {
      const newTrack = dataset!.buildTrack(trackId);

      if (newTrack.length() < 1) {
        // Check track validity
        return;
      }
      setSelectedTrack(newTrack);
      if (seekToFrame) {
        setFrame(newTrack.times[0]);
        plot?.plot(newTrack, featureName, newTrack.times[0]);
      } else {
        plot?.plot(newTrack, featureName, currentFrame);
      }
      setFindTrackInput("" + trackId);
      urlUtils.updateUrl(getUrlParams());
    },
    [canv, plot, dataset, featureName, currentFrame]
  );

  /**
   * Update the canvas dimensions based on the current window size.
   *
   * TODO: Find calculation for margin magic number
   */
  const setSize = (): void => canv.setSize(Math.min(window.innerWidth - 75, 730), Math.min(window.innerHeight, 500));

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
      setSize();

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
    plot?.removePlot();
    plot?.setDataset(dataset!);
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

  // Add event listeners for unloading and resizing on startup.
  useEffect(() => {
    window.addEventListener("beforeunload", () => {
      canv.domElement.removeEventListener("click", handleCanvasClick);
      canv.dispose();
    });

    window.addEventListener("resize", () => {
      setSize();
      canv.render();
    });
  }, []);

  // CANVAS ACTIONS ///////////////////////////////////////////////////////////

  const handleCanvasClick = useCallback(
    async (event: MouseEvent): Promise<void> => {
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      // Reset track input
      setFindTrackInput("");
      if (id < 0) {
        plot?.removePlot();
        canv.setSelectedTrack(null);
        setSelectedTrack(null); // clear selected track when clicking off of cells
      } else {
        const trackId = dataset!.getTrackId(id);
        const newTrack = dataset!.buildTrack(trackId);
        plot?.plot(newTrack, featureName, currentFrame);
        canv.setSelectedTrack(newTrack);
        setSelectedTrack(newTrack);
      }
    },
    [dataset, featureName, currentFrame, canv, plot]
  );

  useEffect(() => {
    canv.domElement.addEventListener("click", handleCanvasClick);
    // Returned callback is fired if/when App is removed from the DOM,
    // or before running useEffect again. This prevents memory issues with
    // duplicate event listeners.
    return () => {
      canv.domElement.removeEventListener("click", handleCanvasClick);
    };
  }, [handleCanvasClick]);

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

      // Clear and/or update UI
      plot?.setDataset(newDataset);
      plot?.removePlot();
      setFindTrackInput("");
      setSelectedTrack(null);
      urlUtils.updateUrl(getUrlParams());
      setSize();

      setDatasetOpen(true);
    },
    [dataset, featureName, canv, plot, currentFrame, getUrlParams]
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
        let errorMessage = loadResult.errorMessage;

        if (errorMessage) {
          // Remove 'Error:' prefixes
          let matches = errorMessage.replace(/^(Error:)*/, "");
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

      if (!isColorRampRangeLocked) {
        setColorRampMin(newDataset?.features[newFeatureName].min || colorRampMin);
        setColorRampMax(newDataset?.features[newFeatureName].max || colorRampMax);
      }

      canv.setFeature(newFeatureName);
      // only update plot if active
      if (selectedTrack) {
        plot?.plot(selectedTrack, newFeatureName, currentFrame);
      }
      urlUtils.updateUrl(getUrlParams());
    },
    [isColorRampRangeLocked, colorRampMin, colorRampMax, canv, plot, selectedTrack, currentFrame]
  );

  const handleFeatureChange = useCallback(
    (value: string): void => {
      console.log(value);
      if (value !== featureName && dataset) {
        updateFeature(dataset, value);
      }
    },
    [featureName, dataset, updateFeature]
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

  const onMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!dataset) {
        return;
      }
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      if (id === BACKGROUND_ID) {
        // Ignore background pixels
        return;
      }
      setHoveredId(id);
    },
    [dataset, canv]
  );

  const onMouseLeave = useCallback((_event: MouseEvent): void => {
    setHoveredId(null);
  }, []);

  useEffect(() => {
    canv.domElement.addEventListener("mousemove", onMouseMove);
    canv.domElement.addEventListener("mouseleave", onMouseLeave);
    return () => {
      canv.domElement.removeEventListener("mousemove", onMouseMove);
      canv.domElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [onMouseMove, onMouseLeave, canv]);

  // SCRUBBING CONTROLS ////////////////////////////////////////////////////

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

  const handleFindTrack = useCallback(async (): Promise<void> => {
    // Load track value
    await findTrack(parseInt(findTrackInput, 10));
  }, [findTrackInput, findTrack]);

  // RECORDING CONTROLS ////////////////////////////////////////////////////

  // Update the callback for TimeControls and RecordingControls if it changes.
  // TODO: TimeControls and RecordingControls should be refactored into components
  // and receive setFrame as props.
  timeControls.setFrameCallback(setFrame);
  recordingControls.setFrameCallback(setFrame);

  // const getImagePrefix = (): string => imagePrefix || `${datasetKey}-${featureName}-`;

  // RENDERING /////////////////////////////////////////////////////////////

  const notificationConfig: NotificationConfig = {
    getContainer: () => notificationContainer.current as HTMLElement,
  };
  const [notificationApi, notificationContextHolder] = notification.useNotification(notificationConfig);
  const openCopyNotification = (): void => {
    navigator.clipboard.writeText(document.URL);
    notificationApi["success"]({
      message: "URL copied to clipboard",
      className: styles.copyNotification,
      placement: "bottomLeft",
      duration: 4,

      icon: <CheckCircleOutlined />,
    });
  };

  const disableUi: boolean = recordingControls.isRecording() || !datasetOpen;
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
            onChange={handleFeatureChange}
          />

          <ColorRampSelector selected={colorRampKey} onChange={(name) => setColorRampKey(name)} disabled={disableUi} />
        </div>
        <div className={styles.headerRight}>
          <Button type="link" className={styles.copyUrlButton} onClick={openCopyNotification}>
            <LinkOutlined />
            Copy URL
          </Button>

          <Button type="primary" disabled={true}>
            Export
          </Button>

          <LoadDatasetButton onRequestLoad={handleLoadRequest} />
        </div>
      </div>

      {/** Main Content: Contains canvas and plot, ramp controls, time controls, etc. */}
      <div className={styles.mainContent}>
        {/** Top Control Bar */}
        <div className={styles.topControls}>
          <h3 style={{ margin: "0" }}>Feature value range</h3>
          <div className={styles.controlsContainer}>
            <div className={styles.labeledColorRamp}>
              <InputNumber
                size="small"
                style={{ width: "80px" }}
                value={colorRampMin}
                onChange={(value) => {
                  value && setColorRampMin(value);
                }}
                controls={false}
                disabled={disableUi}
              />
              <div className={styles.sliderContainer}>
                <Slider
                  min={dataset?.getFeatureData(featureName)?.min}
                  max={dataset?.getFeatureData(featureName)?.max}
                  range={{ draggableTrack: true }}
                  value={[colorRampMin, colorRampMax]}
                  disabled={disableUi}
                  onChange={(value: [number, number]) => {
                    setColorRampMin(value[0]);
                    setColorRampMax(value[1]);
                  }}
                />
                <p className={styles.minSliderLabel}>{dataset?.getFeatureData(featureName)?.min}</p>
                <p className={styles.maxSliderLabel}>{dataset?.getFeatureData(featureName)?.max}</p>
              </div>
              <InputNumber
                size="small"
                type="number"
                style={{ width: "80px" }}
                value={colorRampMax}
                onChange={(value) => {
                  value && setColorRampMax(value);
                }}
                controls={false}
                disabled={disableUi}
              />
            </div>
            <div>
              <Checkbox
                type="checkbox"
                checked={hideValuesOutOfRange}
                onChange={() => {
                  setHideValuesOutOfRange(!hideValuesOutOfRange);
                }}
              >
                Hide values outside of range
              </Checkbox>
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
            <div ref={canvasRef}></div>

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
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="11" viewBox="0 0 8 12">
                    <path d="M7.78017 6.3152L0.654546 11.9127C0.389566 12.1209 0 11.9331 0 11.5975V0.402353C0 0.0667129 0.389566 -0.120911 0.654546 0.0873534L7.78017 5.68483C7.82798 5.72228 7.86665 5.77012 7.89325 5.82473C7.91984 5.87934 7.93366 5.93928 7.93366 6.00002C7.93366 6.06076 7.91984 6.1207 7.89325 6.17531C7.86665 6.22991 7.82798 6.27775 7.78017 6.3152Z" />
                  </svg>
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
                  <IconButton disabled={disableUi} onClick={handleFindTrack}>
                    <SearchOutlined />
                  </IconButton>
                </div>
              </div>
              <div ref={plotRef} style={{ width: "600px", height: "400px" }} />
            </div>
            <Divider orientationMargin={0} />
            <div>
              <h2>Viewer settings</h2>
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
        {/* Hover values */}
        <div>
          <p>Track ID: {hoveredId ? dataset?.getTrackId(hoveredId) : ""}</p>
          <p>Feature: {hoveredId ? getFeatureValue(hoveredId) : ""}</p>
        </div>
      </div>
    </AppStyle>
  );
}

export default App;

/**
 * <div>
          <p>CHANGE BROWSER DOWNLOAD SETTINGS BEFORE USE:</p>
          <p>1) Set your default download location</p>
          <p>2) Turn off 'Ask where to save each file before downloading'</p>
          <br />
          <p>Save image sequence:</p>
          <button
            onClick={() => recordingControls.start(getImagePrefix(), startAtFirstFrame)}
            disabled={recordingControls.isRecording() || timeControls.isPlaying()}
          >
            Start
          </button>
          <button onClick={() => recordingControls.abort()} disabled={!recordingControls.isRecording()}>
            Abort
          </button>
          <p>
            <label>
              Image prefix:
              <input
                value={getImagePrefix()}
                onChange={(event) => {
                  // TODO: Check for illegal characters
                  setImagePrefix(event.target.value);
                }}
              />
            </label>
            <button
              onClick={() => {
                setImagePrefix(null);
              }}
            >
              Use default prefix
            </button>
          </p>
          <p>
            <label>
              <input
                type="checkbox"
                checked={startAtFirstFrame}
                onChange={() => {
                  setStartAtFirstFrame(!startAtFirstFrame);
                }}
              />
              Start at first frame
            </label>
          </p>
        </div>
 */
