import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HexColorString } from "three";
import { ColorRamp, Plotting, ColorizeCanvas, Dataset, Track } from "./colorizer";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";
import RecordingControls from "./colorizer/RecordingControls";
import TimeControls from "./colorizer/TimeControls";
import * as urlUtils from "./colorizer/utils/url_utils";

import styles from "./App.module.css";

const CANVAS_PLACEHOLDER_ID = "canvasPlaceholder";
const COLOR_RAMP_PLACEHOLDER_ID = "colorRamp";
const PLOT_PLACEHOLDER_ID = "plot";

// COLOR RAMPS ///////////////////////////////////////////////////////////

// https://developers.arcgis.com/javascript/latest/visualization/symbols-color-ramps/esri-color-ramps/
const colorStops: HexColorString[][] = [
  // Esri color ramps - Red 5
  ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  // Esri color ramps - Orange 5
  ["#dfe1e6", "#bbbfc9", "#b39e93", "#c4703e", "#8c4a23"],
  // Esri color ramps - Yellow 2
  ["#584100", "#886200", "#b78300", "#e7a300", "#ffc800"],
  // Esri color ramps - Green 4
  ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"],
  // Esri color ramps - Blue 14
  ["#3a4d6b", "#3d6da2", "#799a96", "#ccbe6a", "#ffec99"],
  // Esri color ramps - Purple 4
  ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"],
  // Esri color ramps - Mentone Beach
  ["#48385f", "#995375", "#db4a5b", "#fc9a59", "#fee086"],
  // Esri color ramps - Retro Flow
  ["#007fd9", "#443dbf", "#881fc5", "#bf00bf", "#d43f70", "#d9874c", "#b6a135", "#adbf27", "#c4dc66", "#ebe498"],
  // Esri color ramps - Heatmap 4
  [
    "#0022c8",
    "#2b1ca7",
    "#551785",
    "#801164",
    "#aa0b43",
    "#d50621",
    "#ff0000",
    "#ff3900",
    "#ff7100",
    "#ffaa00",
    "#ffc655",
    "#ffe3aa",
    "#ffffff",
  ],
  // Esri color ramps - Blue and Red 9
  ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"],
  // Esri color ramps - Blue and Red 8
  ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
  // Esri color ramps - Red and Green 9
  ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
  // Esri color ramps - Purple and Red 2
  ["#a53217", "#d2987f", "#fffee6", "#ab84a0", "#570959"],
  // Esri color ramps - Green and Brown 1
  ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"],
];
const colorRamps = colorStops.map((ramp) => new ColorRamp(ramp));
const DEFAULT_RAMP = 4;

/**
 * Gets an array of dataset names from the dataset and collectionData.
 * @param dataset The name of the current dataset.
 * @param collectionData The loaded collectionData.
 * @returns, in the following order:
 * - If collectionData is not null, the array of keys (dataset names) from the collectionData.
 * - If dataset is not null, an array containing just the dataset name.
 * - If both are null, returns an empty array.
 */
function getDatasetNames(dataset: string | null, collectionData: urlUtils.CollectionData | null): string[] {
  if (collectionData) {
    return Array.from(collectionData.keys());
  } else if (dataset) {
    return [dataset];
  } else {
    return [];
  }
}

function App() {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////

  // TODO: ColorizeCanvas breaks some of React's rendering/state update model. Should it be turned into
  // a React component?
  const [plot, setPlot] = useState<Plotting | null>(null);
  const canv = useMemo(() => {
    const canv = new ColorizeCanvas();
    canv.setColorRamp(colorRamps[DEFAULT_RAMP]);
    return canv;
  }, []);

  // Setup for plot + canvas after initial render, since they replace DOM elements.
  useEffect(() => {
    setPlot(new Plotting(PLOT_PLACEHOLDER_ID));
    const element = document.getElementById(CANVAS_PLACEHOLDER_ID);
    element?.parentNode?.replaceChild(canv.domElement, element);
  }, []);

  const initialUrlParams = useMemo(urlUtils.loadParamsFromUrl, []);
  const [collection, setCollection] = useState<string | undefined>();
  const [collectionData, setCollectionData] = useState<urlUtils.CollectionData | undefined>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [colorRamp, setColorRamp] = useState(colorRamps[DEFAULT_RAMP]);

  const [colorRampMin, setColorRampMin] = useState(0);
  const [colorRampMax, setColorRampMax] = useState(0);
  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [hideValuesOutOfRange, setHideValuesOutOfRange] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);

  const [timeControls, setTimeControls] = useState<TimeControls | undefined>();
  const [recordingControls, setRecordingControls] = useState<RecordingControls | undefined>();

  // Recording UI Data
  const [imagePrefix, setImagePrefix] = useState("");
  const [useDefaultPrefix, setUseDefaultPrefix] = useState(true);
  const [startAtFirstFrame, setStartAtFirstFrame] = useState(false);

  const [findTrackInput, setFindTrackInput] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // UTILITY METHODS /////////////////////////////////////////////////////////////
  const updateUrl = useCallback((): void => {
    // Don't include collection parameter in URL if it matches the default.
    let collectionParam = null;
    if (
      collection === urlUtils.DEFAULT_COLLECTION_PATH ||
      collection === urlUtils.DEFAULT_COLLECTION_PATH + "/" + urlUtils.DEFAULT_COLLECTION_FILENAME
    ) {
      collectionParam = null;
    } else {
      collectionParam = collection || null;
    }

    urlUtils.saveParamsToUrl(
      collectionParam,
      datasetName,
      featureName,
      selectedTrack ? selectedTrack.trackId : null,
      currentFrame
    );
  }, [collection, datasetName, featureName, selectedTrack, currentFrame]);

  /**
   * Handles updating the canvas from state (for some common properties) and initiating the canvas
   * render. Also updates other UI elements, including the plot and URL.
   */
  const drawLoop = useCallback(async (): Promise<void> => {
    // Note: Selected track, frame number, etc. are not updated here.
    canv.setShowTrackPath(showTrackPath);
    // canv.setSelectedTrack(selectedTrack);
    canv.setColorMapRangeLock(isColorRampRangeLocked);
    canv.setHideValuesOutOfRange(hideValuesOutOfRange);
    canv.setColorRamp(colorRamp);
    await canv.render();

    if (timeControls && recordingControls) {
      recordingControls.setIsDisabled(!dataset);
      timeControls.setIsDisabled(recordingControls.isRecording());
    }

    setColorRampMin(canv.getColorMapRangeMin());
    setColorRampMax(canv.getColorMapRangeMax());

    // update current time in plot
    plot?.setTime(currentFrame);

    if (!timeControls?.isPlaying()) {
      // Do not update URL while playing for performance + UX reasons
      updateUrl();
    }
  }, [
    dataset,
    datasetName,
    featureName,
    currentFrame,
    selectedTrack,
    hideValuesOutOfRange,
    showTrackPath,
    colorRamp,
    colorRampMin,
    colorRampMax,
    timeControls?.isPlaying(), // updates URL when timeControls stops
    updateUrl,
  ]);

  // Call drawLoop whenever its dependencies change.
  useMemo(() => {
    drawLoop();
  }, [drawLoop]);

  const setFrame = useCallback(
    async (frame: number) => {
      console.log("Set frame to " + frame);
      await canv.setFrame(frame);
      setCurrentFrame(frame);
    },
    [drawLoop, canv]
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
      }
      // await canv.setFrame(newTrack.times[0]);
      canv.setSelectedTrack(newTrack);
      plot?.plot(newTrack, featureName, currentFrame);
      // await drawLoop();
      setFindTrackInput("" + trackId);
      updateUrl();
    },
    [canv, plot, dataset, featureName, currentFrame]
  );

  /**
   * Update the canvas dimensions based on the current window size.
   */
  const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

  // INITIAL SETUP  //////////////////////////////////////////////////////////////////
  // Load database and collections data from the URL.
  useMemo(async () => {
    setSize();

    let { collection: _collection, dataset: _datasetName } = initialUrlParams;
    let _collectionData;
    // Load single dataset instead of collection
    if (_datasetName && urlUtils.isUrl(_datasetName)) {
      await replaceDataset(_datasetName);
      setIsInitialDatasetLoaded(true);
      return;
    }

    // Load collection data.
    _collection = _collection || urlUtils.DEFAULT_COLLECTION_PATH;
    setCollection(_collection);

    try {
      _collectionData = await urlUtils.getCollectionData(_collection);
    } catch (e) {
      console.error(e);
      // TODO: Handle errors with an on-screen popup? This disables the UI entirely because no initialization is done.
      throw new Error(
        `The collection URL is invalid and the default collection data could not be loaded. Please check the collection URL '${collection}'.`
      );
    }

    setCollectionData(_collectionData);

    const defaultDatasetName = urlUtils.getDefaultDatasetName(_collectionData);
    await replaceDataset(_datasetName || defaultDatasetName, _collection, _collectionData);
    setIsInitialDatasetLoaded(true);
  }, []);

  // Run only once the first dataset is loaded.
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
        // Seek to the track ID. Override current frame only if time = -1.
        await findTrack(initialUrlParams.track, initialUrlParams.time < 0);
      }
      let newTime = currentFrame;
      if (initialUrlParams.time >= 0) {
        // Load time (if unset, defaults to track time or default t=0)
        newTime = initialUrlParams.time;
        setCurrentFrame(newTime);
        await canv.setFrame(newTime);
        // timeControls.updateUI();
      }
    };

    setupInitialParameters();
  }, [isInitialDatasetLoaded]);

  useEffect(() => {
    // Initialize controls after first render, as they directly access HTML DOM elements
    // TODO: Refactor into React components
    const newTimeControls = new TimeControls(canv, setFrame);
    const newRecordingControls = new RecordingControls(canv, setFrame);
    setTimeControls(newTimeControls);
    setRecordingControls(newRecordingControls);
    newTimeControls.addPauseListener(updateUrl);
    newRecordingControls.setCanvas(canv);

    // Add event listeners for unloading and resizing.
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
      drawLoop();
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

  // COLOR RAMP /////////////////////////////////////////////////////////////
  // Update color ramp element with new options once selected
  useEffect(() => {
    // const element = document.getElementById(CANVAS_PLACEHOLDER_ID);
    // element?.parentNode?.replaceChild(canv.domElement, element);
    const rampContainer = document.getElementById(COLOR_RAMP_PLACEHOLDER_ID);
    if (!rampContainer) {
      return;
    }

    // Clear existing children, if any exist.
    let lastChild = rampContainer.lastChild;
    while (lastChild) {
      rampContainer.removeChild(lastChild);
      lastChild = rampContainer.lastChild;
    }

    // Make the color ramps, then append them to the container
    const ramps = colorRamps.map((ramp, idx) => {
      const rampCanvas = ramp.createGradientCanvas(120, 25);
      if (idx === DEFAULT_RAMP) {
        rampCanvas.className = styles.selected;
      }
      return rampCanvas;
    });

    for (let ramp of ramps) {
      rampContainer.appendChild(ramp);
    }
  }, []);

  function handleColorRampClick({ target }: React.MouseEvent<HTMLSpanElement, MouseEvent>): void {
    const rampContainer = document.getElementById(COLOR_RAMP_PLACEHOLDER_ID);
    if (!rampContainer) {
      return;
    }
    // Select the element that was clicked on and set it as the new color ramp.
    Array.from(rampContainer.children).forEach((el, idx) => {
      if (el === target) {
        setColorRamp(colorRamps[idx]);
        el.className = styles.selected;
      } else {
        el.className = "";
      }
    });
  }

  // DATASET LOADING ///////////////////////////////////////////////////////
  async function replaceDataset(
    _dataset: string,
    _collection?: string | null,
    _collectionData?: urlUtils.CollectionData | null
  ): Promise<void> {
    console.time("loadDataset");
    setDatasetOpen(false);

    if (_collectionData && !_collectionData.has(_dataset)) {
      console.warn(
        `Collection does not include '${_dataset}' as a dataset. Defaulting to first dataset in the collection.`
      );
      _dataset = urlUtils.getDefaultDatasetName(_collectionData);
    }

    let newDataset;
    try {
      const datasetPath = urlUtils.getExpectedDatasetPath(
        _dataset,
        _collection || undefined,
        _collectionData || undefined
      );

      console.log(`Fetching dataset from path '${datasetPath}'`);
      newDataset = new Dataset(datasetPath);
      await newDataset.open();

      // Replace old dataset
      if (dataset !== null) {
        dataset.dispose();
      }
    } catch (e) {
      console.error(e);
      console.error(`Could not load dataset '${_dataset}'.`);
      console.timeEnd("loadDataset");
      if (dataset !== null) {
        console.warn(`Showing last loaded dataset '${_dataset}' instead.`);
        setDatasetOpen(true);
        return;
      } else {
        // Encountered error on first dataset load
        // Check if this is a collection-- if so, there's maybe a default dataset that can be loaded instead
        if (!_collectionData) {
          return;
        }
        const defaultName = urlUtils.getDefaultDatasetName(_collectionData);
        if (_dataset === defaultName) {
          return; // we already tried to load the default so give up
        }
        console.warn(`Attempting to load this collection's default dataset '${defaultName}' instead.`);
        return replaceDataset(defaultName, _collection, _collectionData);
      }
    }
    setFindTrackInput("");

    // Only change the feature if there's no equivalent in the new dataset
    let newFeatureName = featureName;
    if (!newDataset.hasFeature(newFeatureName)) {
      newFeatureName = newDataset.featureNames[0];
    }

    await canv.setDataset(newDataset);
    updateFeature(newDataset, newFeatureName);
    plot?.setDataset(newDataset);
    plot?.removePlot();

    // Clamp frame to new range
    const newFrame = Math.min(currentFrame, canv.getTotalFrames());
    canv.setFrame(newFrame);
    // Update state variables
    setCurrentFrame(newFrame);
    setDatasetOpen(true);
    setDataset(newDataset);
    setDatasetName(_dataset);
    setFeatureName(newFeatureName);

    updateUrl();
    console.timeEnd("loadDataset");
  }

  // DISPLAY CONTROLS //////////////////////////////////////////////////////
  const handleDatasetChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = event.target.value;
      if (value !== datasetName) {
        replaceDataset(value, collection, collectionData);
      }
    },
    [datasetName, collection, collectionData]
  );

  async function updateFeature(newDataset: Dataset, newFeatureName: string): Promise<void> {
    if (!newDataset?.hasFeature(newFeatureName)) {
      console.warn("Dataset does not have feature '" + newFeatureName + "'.");
      return;
    }
    setFeatureName(newFeatureName);
    canv.setFeature(newFeatureName);
    // only update plot if active
    if (selectedTrack) {
      plot?.plot(selectedTrack, newFeatureName, currentFrame);
    }
    updateUrl();
  }

  function handleFeatureChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    console.log(value);
    if (value !== featureName && dataset) {
      updateFeature(dataset, value);
    }
  }

  async function handleResetRangeClick(): Promise<void> {
    canv.resetColorMapRange();
    // await drawLoop(); // update UI
    setColorRampMin(canv.getColorMapRangeMin());
    setColorRampMax(canv.getColorMapRangeMax());
  }

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
    [dataset]
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
  }, [onMouseMove, onMouseLeave]);

  // SCRUBBING CONTROLS ////////////////////////////////////////////////////
  function handleKeyDown({ key }: KeyboardEvent): void {
    if (key === "ArrowLeft" || key === "Left") {
      timeControls?.handleFrameAdvance(-1);
    } else if (key === "ArrowRight" || key === "Right") {
      timeControls?.handleFrameAdvance(1);
    }
  }

  useMemo(() => {
    window.addEventListener("keydown", handleKeyDown);
  }, []);

  const handleFindTrack = useCallback(async (): Promise<void> => {
    // Load track value
    await findTrack(parseInt(findTrackInput));
  }, [findTrackInput, findTrack]);

  // RECORDING CONTROLS ////////////////////////////////////////////////////
  // Update the callback for TimeControls and RecordingControls if it changes.
  // TODO: TimeControls and RecordingControls should be refactored to receive
  // setFrame as props.
  useMemo(() => {
    timeControls?.setFrameCallback(setFrame);
    recordingControls?.setFrameCallback(setFrame);
  }, [setFrame]);

  // Update the default recording controls prefix.
  useMemo(() => {
    if (useDefaultPrefix && datasetName && featureName) {
      setImagePrefix(`${datasetName}-${featureName}-`);
    }
  }, [useDefaultPrefix, datasetName, featureName]);

  // RENDERING /////////////////////////////////////////////////////////////
  const disableUi: boolean = recordingControls?.isRecording() || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  return (
    <div>
      <p>This section is being rendered by React.</p>

      {/** Top Control Bar */}
      <div className={styles.canvasTopControlsContainer}>
        <label htmlFor="dataset">Dataset</label>
        <select
          name="Dataset"
          id="dataset"
          style={{ textOverflow: "ellipsis", maxWidth: "200px" }}
          disabled={disableUi}
          onChange={handleDatasetChange}
          value={datasetName}
        >
          {getDatasetNames(datasetName, collectionData || null).map((name) => {
            return (
              <option value={name} key={name}>
                {name}
              </option>
            );
          })}
        </select>
        <label htmlFor="feature">Feature</label>
        <select name="Feature" id="feature" disabled={disableUi} onChange={handleFeatureChange} value={featureName}>
          {dataset?.featureNames.map((name) => {
            return (
              <option value={name} key={name}>
                {name}
              </option>
            );
          })}
        </select>

        {/** Color Ramp */}
        <div className={styles.labeledColorRamp}>
          <input
            type="number"
            id="colorRampMin"
            style={{ width: "50px", textAlign: "start" }}
            value={canv.getColorMapRangeMin()}
            onChange={(event) => {
              canv.setColorMapRangeMin(event.target.valueAsNumber);
              setColorRampMin(event.target.valueAsNumber);
            }}
            min="0"
          />
          <div className={styles.colorRampContainer}>
            <span
              id={COLOR_RAMP_PLACEHOLDER_ID}
              className={`${styles.colorRamp} ${disableUi ? styles.disabled : ""}`}
              onClick={(event) => handleColorRampClick(event)}
            ></span>
          </div>
          <input
            type="number"
            id="colorRampMax"
            style={{ width: "80px", textAlign: "start" }}
            value={canv.getColorMapRangeMax()}
            onChange={(event) => {
              canv.setColorMapRangeMax(event.target.valueAsNumber);
              setColorRampMax(event.target.valueAsNumber);
            }}
            min="0"
          />
          <button id="resetRangeButton" onClick={handleResetRangeClick}>
            Reset range
          </button>
          <input
            type="checkbox"
            id="lockRangeCheckbox"
            checked={isColorRampRangeLocked}
            onChange={() => {
              // Invert lock on range
              setIsColorRampRangeLocked(!isColorRampRangeLocked);
              canv.setColorMapRangeLock(!isColorRampRangeLocked);
            }}
          />
          <label htmlFor="lockRangeCheckbox">Lock color map range</label>
          <input
            type="checkbox"
            id="hideOutOfRangeCheckbox"
            checked={hideValuesOutOfRange}
            onChange={() => {
              setHideValuesOutOfRange(!hideValuesOutOfRange);
            }}
          />
          <label htmlFor="hideOutOfRangeCheckbox">Hide values outside of range</label>
        </div>
      </div>

      {/** Canvas */}
      <div id={CANVAS_PLACEHOLDER_ID}></div>

      {/** Bottom Control Bar */}
      <div className={styles.canvasBottomControlsContainer}>
        <div>
          <div>
            Time (use arrow keys)
            <div className={styles.timeControls} style={{ margin: "2px" }}>
              <button
                id="playBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls?.handlePlayButtonClick()}
              >
                Play
              </button>
              <button
                id="pauseBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls?.handlePauseButtonClick()}
              >
                Pause
              </button>
              <button
                id="backBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls?.handleFrameAdvance(-1)}
              >
                Back
              </button>
              <button
                id="forwardBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls?.handleFrameAdvance(1)}
              >
                Forward
              </button>
              <input
                id="timeSlider"
                type="range"
                min="0"
                max={dataset ? dataset.numberOfFrames - 1 : 0}
                disabled={disableTimeControlsUi}
                step="1"
                value={currentFrame}
                onChange={(event) => {
                  // TODO: Debounce changes to time slider (currently instantly changes)
                  setFrame(event.target.valueAsNumber);
                }}
              />
              <input
                type="number"
                id="timeValue"
                min="0"
                max={dataset ? dataset.numberOfFrames - 1 : 0}
                disabled={disableTimeControlsUi}
                value={currentFrame}
                onChange={(event) => {
                  setFrame(event.target.valueAsNumber);
                }}
              />
            </div>
          </div>

          <div>
            Find by track:
            <input
              id="trackValue"
              disabled={disableUi}
              type="number"
              value={findTrackInput}
              onChange={(event) => {
                setFindTrackInput(event.target.value);
              }}
            />
            <button id="findTrackBtn" disabled={disableUi} onClick={handleFindTrack}>
              Find
            </button>
          </div>
        </div>

        {/* Hover values */}
        <div>
          <p id="mouseTrackId">Track ID: {hoveredId ? dataset?.getTrackId(hoveredId) : ""}</p>
          <p id="mouseFeatureValue">Feature: {hoveredId ? getFeatureValue(hoveredId) : ""}</p>
          <input
            type="checkbox"
            id="show_track_path"
            checked={showTrackPath}
            onChange={() => {
              setShowTrackPath(!showTrackPath);
            }}
          />
          <label htmlFor="show_track_path">Show track path</label>
        </div>
      </div>

      <div id={PLOT_PLACEHOLDER_ID} style={{ width: "600px", height: "250px" }}></div>

      <div id="recording_controls_container">
        <p>CHANGE BROWSER DOWNLOAD SETTINGS BEFORE USE:</p>
        <p>1) Set your default download location</p>
        <p>2) Turn off 'Ask where to save each file before downloading'</p>
        <br />
        <p>Save image sequence:</p>
        <button
          id="sequence_start_btn"
          onClick={() => recordingControls?.start(imagePrefix, startAtFirstFrame)}
          disabled={recordingControls?.isRecording() || timeControls?.isPlaying()}
        >
          Start
        </button>
        <button
          id="sequence_abort_btn"
          onClick={() => recordingControls?.abort()}
          disabled={!recordingControls?.isRecording()}
        >
          Abort
        </button>
        <p>
          <label>Image prefix:</label>
          <input
            id="sequencePrefix"
            value={imagePrefix}
            onChange={(event) => {
              setImagePrefix(event.target.value);
              setUseDefaultPrefix(false);
            }}
          />
          <button
            id="sequencePrefix_reset_btn"
            onClick={() => {
              setUseDefaultPrefix(true);
            }}
          >
            Use default prefix
          </button>
        </p>
        <p>
          <input
            id="sequenceStartFrameCheckbox"
            type="checkbox"
            checked={startAtFirstFrame}
            onChange={() => {
              setStartAtFirstFrame(!startAtFirstFrame);
            }}
          />
          <label htmlFor="sequenceStartFrameCheckbox">Start at first frame</label>
        </p>
      </div>
    </div>
  );
}

export default App;
