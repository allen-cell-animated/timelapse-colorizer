import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset, Track, Plotting } from "./colorizer";
import RecordingControls from "./colorizer/RecordingControls";
import TimeControls from "./colorizer/TimeControls";
import * as urlUtils from "./colorizer/utils/url_utils";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";
import { createRoot } from "react-dom/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./App.module.css";

// Clear the existing HTML content
// document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const CANVAS_PLACEHOLDER_ID = "canvasPlaceholder";

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

/**
 * Loads a dataset from a URL, handling
 * @param dataset
 * @param collection
 * @param collectionData
 * @throws an error if the dataset could not be loaded.
 */
async function loadDataset(
  dataset: string,
  collection?: string | null,
  collectionData?: urlUtils.CollectionData | null
): Promise<Dataset> {
  console.time("loadDataset");

  // Handle default case
  if (collectionData && !collectionData.has(dataset)) {
    console.warn(
      `Collection does not include '${dataset}' as a dataset. Defaulting to first dataset in the collection.`
    );
    dataset = urlUtils.getDefaultDatasetName(collectionData);
  }

  let newDataset;
  const datasetPath = urlUtils.getExpectedDatasetPath(dataset, collection || undefined, collectionData || undefined);
  console.log(`Fetching dataset from path '${datasetPath}'`);
  newDataset = new Dataset(datasetPath);
  await newDataset.open();

  return newDataset;
}

function App() {
  const [plot, setPlot] = useState<Plotting | null>(null);
  const canv = useMemo(() => {
    return new ColorizeCanvas();
  }, []);

  const [collection, setCollection] = useState<string | undefined>();
  const [collectionData, setCollectionData] = useState<urlUtils.CollectionData | undefined>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  const [colorRampMin, setColorRampMin] = useState(0);
  const [colorRampMax, setColorRampMax] = useState(0);
  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [hideValuesOutOfRange, setHideValuesOutOfRange] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);
  const [imagePrefix, setImagePrefix] = useState("");

  const timeControls = useMemo(
    () =>
      new TimeControls(canv, (frame) => {
        setCurrentFrame(frame);
        canv.setFrame(frame);
      }),
    []
  );

  const drawLoop = useCallback(async (): Promise<void> => {
    console.log("Draw");

    await canv.setFrame(currentFrame);

    canv.setSelectedTrack(selectedTrack);

    await canv.render();
    // Update UI Elements
    timeControls.setIsDisabled(recordingControls.isRecording());
    // timeControls.updateUI();
    recordingControls.setIsDisabled(!dataset);
    recordingControls.setDefaultFilePrefix(`${datasetName}-${featureName}-`);
    recordingControls.updateUI();

    setColorRampDisabled(disableUi);

    // update current time in plot
    plot?.setTime(currentFrame);

    if (!timeControls.isPlaying()) {
      // Do not update URL while playing for performance + UX reasons
      updateUrl();
    }
  }, [currentFrame, selectedTrack, dataset, datasetName, featureName]);

  // Draw loop; update UI when any of the dependencies change
  useEffect(() => {
    drawLoop();
  }, [datasetName, featureName, colorRampMin, colorRampMax, currentFrame, showTrackPath, hideValuesOutOfRange]);

  const recordingControls = useMemo(() => new RecordingControls(canv, drawLoop), []);

  // TODO: Move input handler into module
  const [findTrackInput, setFindTrackInput] = useState("");

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // URL STATE /////////////////////////////////////////////////////////////
  // Treat Url as a callback to reduce computation, and to let it be called from other immediate actions.
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

  const handleCanvasClick = useCallback(
    async (event: MouseEvent): Promise<void> => {
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      // Reset track input
      resetTrackUI();
      if (id < 0) {
        plot?.removePlot();
        setSelectedTrack(null); // clear selected track when clicking off of cells
      } else {
        const trackId = dataset!.getTrackId(id);
        const newTrack = dataset!.buildTrack(trackId);
        plot?.plot(newTrack, featureName, currentFrame);
        setSelectedTrack(newTrack);
      }
    },
    [dataset, featureName]
  );

  useEffect(() => {
    console.log(currentFrame);
  }, [currentFrame]);

  useEffect(() => {
    window.addEventListener("click", handleCanvasClick);
    // Returned callback is fired if/when App is removed from the DOM
    return () => {
      window.removeEventListener("click", handleCanvasClick);
    };
  }, [handleCanvasClick]);

  // SETUP & DRAWING ///////////////////////////////////////////////////////

  // INITAL SETUP

  const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

  async function initialSetup(): Promise<void> {
    const params = urlUtils.loadParamsFromUrl();
    let { collection: _collection, dataset: _dataset, feature: _feature, track: _track, time: _time } = params;
    let _collectionData;

    console.trace();
    setSize();
    populateColorRampSelect();
    canv.setColorRamp(colorRamps[DEFAULT_RAMP]);

    // Load dataset
    if (_dataset && urlUtils.isUrl(_dataset)) {
      await replaceDataset(_dataset);
    } else {
      // Collections data is loaded.
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

      const defaultDataset = urlUtils.getDefaultDatasetName(_collectionData);
      await replaceDataset(_dataset || defaultDataset, _collection, _collectionData);
    }

    if (_feature) {
      // Load feature (if unset, do nothing because loadDataset already loads a default)
      await updateFeature(_feature);
    }
    if (_track >= 0) {
      // Seek to the track ID
      await findTrack(_track);
    }
    if (_time >= 0) {
      // Load time (if unset, defaults to track time or default t=0)
      setCurrentFrame(_time);
      canv.setFrame(_time);
      // timeControls.updateUI();
    }
    // await drawLoop(); // Force redraw to show the new frame

    window.addEventListener("keydown", handleKeyDown);
    recordingControls.setCanvas(canv);
    timeControls.addPauseListener(updateUrl);
  }

  useMemo(() => {
    initialSetup();
  }, []);

  // After first render
  useEffect(() => {
    setPlot(new Plotting("plot")); // Done after initial render so it can replace the HTML Element w/ id "plot"

    // Mount canvas
    const element = document.getElementById(CANVAS_PLACEHOLDER_ID);
    element?.parentNode?.replaceChild(canv.domElement, element);
  }, []);

  window.addEventListener("beforeunload", () => {
    canv.domElement.removeEventListener("click", handleCanvasClick);
    canv.dispose();
  });

  window.addEventListener("resize", () => {
    setSize();
    canv.render();
  });

  function populateColorRampSelect(): void {
    const width = 120,
      height = 25;
    // Sets dimensions for color ramp container, as color ramp isn't inline (absolute/floating)
    // colorRampContainerEl.style.width = `${width}px`;
    // colorRampContainerEl.style.height = `${height}px`;
    colorRamps.forEach((ramp, idx) => {
      const rampCanvas = ramp.createGradientCanvas(width, height);
      if (idx === DEFAULT_RAMP) {
        rampCanvas.className = "selected";
      }
      // colorRampSelectEl.appendChild(rampCanvas);
    });
  }

  function setColorRampDisabled(disabled: boolean): void {
    // colorRampSelectEl.className = disabled ? "disabled" : "";
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
    console.log(_dataset);
    console.log(_collection);
    console.log(_collectionData);

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
    resetTrackUI();

    // Only change the feature if there's no equivalent in the new dataset
    let newFeatureName = featureName;
    if (!newDataset.hasFeature(newFeatureName)) {
      newFeatureName = newDataset.featureNames[0];
    }

    await canv.setDataset(newDataset);
    updateFeature(newFeatureName);
    plot?.setDataset(newDataset);
    plot?.removePlot();

    const newFrame = currentFrame % canv.getTotalFrames();
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

  function handleFeatureChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    console.log(value);
    if (value !== featureName) {
      updateFeature(value);
    }
  }

  async function updateFeature(newFeatureName: string): Promise<void> {
    if (!dataset?.hasFeature(newFeatureName)) {
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

  async function handleResetRangeClick(): Promise<void> {
    canv.resetColorMapRange();
    // await drawLoop(); // update UI
    setColorRampMin(canv.getColorMapRangeMin());
    setColorRampMax(canv.getColorMapRangeMax());
  }

  // function handleColorRampClick({ target }: MouseEvent): void {
  //   Array.from(colorRampSelectEl.children).forEach((el, idx) => {
  //     if (el === target) {
  //       canv.setColorRamp(colorRamps[idx]);
  //       el.className = "selected";
  //     } else {
  //       el.className = "";
  //     }
  //   });
  //   canv.render();
  // }

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
      timeControls.handleFrameAdvance(-1);
    } else if (key === "ArrowRight" || key === "Right") {
      timeControls.handleFrameAdvance(1);
    }
  }

  const findTrack = useCallback(
    async (trackId: number): Promise<void> => {
      const newTrack = dataset!.buildTrack(trackId);

      if (newTrack.length() < 1) {
        // Check track validity
        return;
      }
      setSelectedTrack(newTrack);
      setCurrentFrame(newTrack.times[0]);
      // await canv.setFrame(newTrack.times[0]);
      canv.setSelectedTrack(newTrack);
      plot?.plot(newTrack, featureName, currentFrame);
      // await drawLoop();
      setFindTrackInput("" + trackId);
      updateUrl();
    },
    [canv, plot, dataset, featureName, currentFrame]
  );

  const handleFindTrack = useCallback(async (): Promise<void> => {
    // Load track value
    await findTrack(parseInt(findTrackInput));
  }, [findTrackInput, findTrack]);

  function resetTrackUI(): void {
    setFindTrackInput("");
  }

  async function handleShowTrackPathChanged(): Promise<void> {
    canv.setShowTrackPath(showTrackPath);
    // await drawLoop();
  }

  // RENDERING /////////////////////////////////////////////////////////////
  const disableUi: boolean = recordingControls.isRecording() || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  return (
    <div>
      <p>This section is being rendered by React.</p>

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
            <span id="colorRamp"></span>
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
              // Invert lock on range
              setHideValuesOutOfRange(!hideValuesOutOfRange);
              canv.setHideValuesOutOfRange(!hideValuesOutOfRange);
            }}
          />
          <label htmlFor="hideOutOfRangeCheckbox">Hide values outside of range</label>
        </div>
      </div>

      <div id={CANVAS_PLACEHOLDER_ID}></div>

      <div className={styles.canvasBottomControlsContainer}>
        <div>
          <div>
            Time (use arrow keys)
            <div className={styles.timeControls} style={{ margin: "2px" }}>
              <button
                id="playBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls.handlePlayButtonClick()}
              >
                Play
              </button>
              <button
                id="pauseBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls.handlePauseButtonClick()}
              >
                Pause
              </button>
              <button id="backBtn" disabled={disableTimeControlsUi} onClick={() => timeControls.handleFrameAdvance(-1)}>
                Back
              </button>
              <button
                id="forwardBtn"
                disabled={disableTimeControlsUi}
                onClick={() => timeControls.handleFrameAdvance(1)}
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
                  // TODO: Debounce changes to time slider
                  setCurrentFrame(event.target.valueAsNumber);
                  // canv.setFrame(event.target.valueAsNumber);
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
                  setCurrentFrame(event.target.valueAsNumber);
                  // canv.setFrame(event.target.valueAsNumber);
                }}
              />
            </div>
          </div>

          <div>
            Find by track:
            <input id="trackValue" disabled={disableUi} type="number" defaultValue="" />
            <button id="findTrackBtn" disabled={disableUi}>
              Find
            </button>
          </div>
        </div>

        {/* Hover value section */}
        <div>
          <p id="mouseTrackId">Track ID: {hoveredId ? dataset?.getTrackId(hoveredId) : ""}</p>
          <p id="mouseFeatureValue">Feature: {hoveredId ? getFeatureValue(hoveredId) : ""}</p>
          <input
            type="checkbox"
            id="show_track_path"
            checked={showTrackPath}
            onChange={() => {
              setShowTrackPath(!showTrackPath);
              canv.setShowTrackPath(!showTrackPath);
            }}
          />
          <label htmlFor="show_track_path">Show track path</label>
        </div>
      </div>

      <div id="plot" style={{ width: "600px", height: "250px" }}></div>
    </div>
  );
}

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
