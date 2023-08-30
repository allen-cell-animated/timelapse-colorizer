import React, { ReactElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plotting, ColorizeCanvas, Dataset, Track } from "./colorizer";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";
import RecordingControls from "./colorizer/RecordingControls";
import TimeControls from "./colorizer/TimeControls";
import * as urlUtils from "./colorizer/utils/url_utils";

import styles from "./App.module.css";
import { useConstructor, useDebounce } from "./colorizer/utils/react_utils";
import { DEFAULT_COLOR_RAMPS, DEFAULT_COLOR_RAMP_ID } from "./constants";

function App(): ReactElement {
  // STATE INITIALIZATION /////////////////////////////////////////////////////////

  const canvasRef = useRef<HTMLDivElement>(null);
  const colorRampRef = useRef<HTMLSpanElement>(null);
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

  const [collection, setCollection] = useState<string | undefined>();
  const [collectionData, setCollectionData] = useState<urlUtils.CollectionData | undefined>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);

  const [colorRamp, setColorRamp] = useState(DEFAULT_COLOR_RAMPS[DEFAULT_COLOR_RAMP_ID]);
  const [colorRampMin, setColorRampMin] = useState(0);
  const [colorRampMax, setColorRampMax] = useState(0);
  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [hideValuesOutOfRange, setHideValuesOutOfRange] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);

  const timeControls = useConstructor(() => {
    return new TimeControls(canv!);
  });
  const recordingControls = useConstructor(() => {
    return new RecordingControls(canv);
  });

  // Recording UI
  const [imagePrefix, setImagePrefix] = useState("");
  const [useDefaultPrefix, setUseDefaultPrefix] = useState(true);
  const [startAtFirstFrame, setStartAtFirstFrame] = useState(false);
  /** The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);
  const [findTrackInput, setFindTrackInput] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // UTILITY METHODS /////////////////////////////////////////////////////////////

  /**
   * Copy the current collection, dataset, feature, track, and frame information
   * to the page URL.
   */
  const updateUrl = useCallback((): void => {
    urlUtils.saveParamsToUrl(
      collection || null,
      datasetName,
      featureName,
      selectedTrack ? selectedTrack.trackId : null,
      currentFrame
    );
  }, [collection, datasetName, featureName, selectedTrack, currentFrame]);

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
    canv.setColorRamp(colorRamp);
    canv.setColorMapRangeMin(colorRampMin);
    canv.setColorMapRangeMax(colorRampMax);
    canv.setSelectedTrack(selectedTrack);
    canv.render();

    // update current time in plot
    plot?.setTime(currentFrame);

    if (!timeControls.isPlaying() && !recordingControls.isRecording()) {
      // Do not update URL while playback is happening for performance + UX reasons
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
    timeControls.isPlaying(), // updates URL when timeControls stops
    updateUrl,
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
      updateUrl();
    },
    [canv, plot, dataset, featureName, currentFrame]
  );

  /**
   * Update the canvas dimensions based on the current window size.
   */
  const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

  // INITIAL SETUP  ////////////////////////////////////////////////////////////////

  // Use a memoized value here and only retrieve parameters once, because the URL can be updated
  // by state updates and lose information (like the track, feature, time, etc.) that isn't
  // accessed in the first render.
  const initialUrlParams = useMemo(urlUtils.loadParamsFromUrl, []);

  // Load database and collections data from the URL.
  // This is memoized so that it only runs one time on startup.
  // TODO: Move this out of App's render into either `Collections.ts` or `url_utils.ts`.
  //  Also, handle collections when single-URL datasets are loaded by making a new collection with a single entry?
  useMemo(async () => {
    setSize();

    let _collection = initialUrlParams.collection;
    const _datasetName = initialUrlParams.dataset;
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

  // Run once
  useEffect(() => {
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
  // Initialize the color ramp gradients after the initial render.
  useEffect(() => {
    const rampContainer = colorRampRef.current;
    if (!rampContainer) {
      return;
    }

    // Clear existing children.
    let lastChild = rampContainer.lastChild;
    while (lastChild) {
      rampContainer.removeChild(lastChild);
      lastChild = rampContainer.lastChild;
    }

    // Make the color ramps, then append them to the container
    const ramps = DEFAULT_COLOR_RAMPS.map((ramp, idx) => {
      const rampCanvas = ramp.createGradientCanvas(120, 25);
      if (idx === DEFAULT_COLOR_RAMP_ID) {
        rampCanvas.className = styles.selected;
      }
      return rampCanvas;
    });

    for (const ramp of ramps) {
      rampContainer.appendChild(ramp);
    }
  }, []);

  const handleColorRampClick = useCallback(({ target }: React.MouseEvent<HTMLSpanElement, MouseEvent>): void => {
    const rampContainer = colorRampRef.current;
    if (!rampContainer) {
      return;
    }
    // Select the element that was clicked on and set it as the new color ramp.
    Array.from(rampContainer.children).forEach((el, idx) => {
      if (el === target) {
        setColorRamp(DEFAULT_COLOR_RAMPS[idx]);
        el.className = styles.selected;
      } else {
        el.className = "";
      }
    });
  }, []);

  // DATASET LOADING ///////////////////////////////////////////////////////
  const replaceDataset = useCallback(
    async (
      datasetNameParam: string,
      collectionParam?: string | null,
      collectionDataParam?: urlUtils.CollectionData | null
    ): Promise<void> => {
      console.time("loadDataset");
      setDatasetOpen(false);

      if (collectionDataParam && !collectionDataParam.has(datasetNameParam)) {
        console.warn(
          `Collection does not include '${datasetNameParam}' as a dataset. Defaulting to first dataset in the collection.`
        );
        datasetNameParam = urlUtils.getDefaultDatasetName(collectionDataParam);
      }

      let newDataset;
      try {
        const datasetPath = urlUtils.getExpectedDatasetPath(
          datasetNameParam,
          collectionParam || undefined,
          collectionDataParam || undefined
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
        console.error(`Could not load dataset '${datasetNameParam}'.`);
        console.timeEnd("loadDataset");
        if (dataset !== null) {
          console.warn(`Showing last loaded dataset '${datasetNameParam}' instead.`);
          setDatasetOpen(true);
          return;
        } else {
          // Encountered error on first dataset load
          // Check if this is a collection-- if so, there's maybe a default dataset that can be loaded instead
          if (!collectionDataParam) {
            return;
          }
          const defaultName = urlUtils.getDefaultDatasetName(collectionDataParam);
          if (datasetNameParam === defaultName) {
            return; // we already tried to load the default so give up
          }
          console.warn(`Attempting to load this collection's default dataset '${defaultName}' instead.`);
          return replaceDataset(defaultName, collectionParam, collectionDataParam);
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
      setDatasetName(datasetNameParam);
      setFeatureName(newFeatureName);

      updateUrl();
      console.timeEnd("loadDataset");
    },
    [dataset, featureName, canv, plot, currentFrame, updateUrl]
  );

  // DISPLAY CONTROLS //////////////////////////////////////////////////////
  const handleDatasetChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = event.target.value;
      if (value !== datasetName) {
        replaceDataset(value, collection, collectionData);
      }
    },
    [replaceDataset, collection, collectionData, datasetName]
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
      updateUrl();
    },
    [isColorRampRangeLocked, colorRampMin, colorRampMax, canv, plot, selectedTrack, currentFrame]
  );

  const handleFeatureChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = event.target.value;
      console.log(value);
      if (value !== featureName && dataset) {
        updateFeature(dataset, value);
      }
    },
    [featureName, dataset, updateFeature]
  );

  const handleResetRangeClick = useCallback(async (): Promise<void> => {
    canv.resetColorMapRange();
    setColorRampMin(canv.getColorMapRangeMin());
    setColorRampMax(canv.getColorMapRangeMax());
  }, [canv]);

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

  // Update the default recording controls prefix.
  useMemo(() => {
    if (useDefaultPrefix && datasetName && featureName) {
      setImagePrefix(`${datasetName}-${featureName}-`);
    }
  }, [useDefaultPrefix, datasetName, featureName]);

  // RENDERING /////////////////////////////////////////////////////////////

  const disableUi: boolean = recordingControls.isRecording() || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  return (
    <div>
      {/** Top Control Bar */}
      <div className={styles.canvasTopControlsContainer}>
        <label>
          Dataset
          <select
            name="Dataset"
            style={{ textOverflow: "ellipsis", maxWidth: "200px" }}
            disabled={disableUi}
            onChange={handleDatasetChange}
            value={datasetName}
          >
            {urlUtils.getDatasetNames(datasetName, collectionData || null).map((name) => {
              return (
                <option value={name} key={name}>
                  {name}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Feature
          <select name="Feature" disabled={disableUi} onChange={handleFeatureChange} value={featureName}>
            {dataset?.featureNames.map((name) => {
              return (
                <option value={name} key={name}>
                  {name}
                </option>
              );
            })}
          </select>
        </label>

        {/** Color Ramp */}
        <div className={styles.labeledColorRamp}>
          <input
            type="number"
            style={{ width: "50px", textAlign: "start" }}
            value={canv.getColorMapRangeMin()}
            onChange={(event) => {
              // Must set both to force render update
              canv.setColorMapRangeMin(event.target.valueAsNumber);
              setColorRampMin(event.target.valueAsNumber);
            }}
            min="0"
          />
          <div className={styles.colorRampContainer}>
            <span
              ref={colorRampRef}
              className={`${styles.colorRamp} ${disableUi ? styles.disabled : ""}`}
              onClick={(event) => handleColorRampClick(event)}
            ></span>
          </div>
          <input
            type="number"
            style={{ width: "80px", textAlign: "start" }}
            value={canv.getColorMapRangeMax()}
            onChange={(event) => {
              canv.setColorMapRangeMax(event.target.valueAsNumber);
              setColorRampMax(event.target.valueAsNumber);
            }}
            min="0"
          />
          <button onClick={handleResetRangeClick}>Reset range</button>
          <label>
            <input
              type="checkbox"
              checked={isColorRampRangeLocked}
              onChange={() => {
                // Invert lock on range
                setIsColorRampRangeLocked(!isColorRampRangeLocked);
              }}
            />
            Lock color map range
          </label>
          <label>
            <input
              type="checkbox"
              checked={hideValuesOutOfRange}
              onChange={() => {
                setHideValuesOutOfRange(!hideValuesOutOfRange);
              }}
            />
            Hide values outside of range
          </label>
        </div>
      </div>

      {/** Canvas */}
      <div ref={canvasRef}></div>

      {/** Bottom Control Bar */}
      <div className={styles.canvasBottomControlsContainer}>
        <div>
          <div>
            Time (use arrow keys)
            <div className={styles.timeControls} style={{ margin: "2px" }}>
              <button disabled={disableTimeControlsUi} onClick={() => timeControls.handlePlayButtonClick()}>
                Play
              </button>
              <button disabled={disableTimeControlsUi} onClick={() => timeControls.handlePauseButtonClick()}>
                Pause
              </button>
              <button disabled={disableTimeControlsUi} onClick={() => timeControls.handleFrameAdvance(-1)}>
                Back
              </button>
              <button disabled={disableTimeControlsUi} onClick={() => timeControls.handleFrameAdvance(1)}>
                Forward
              </button>
              <input
                type="range"
                min="0"
                max={dataset ? dataset.numberOfFrames - 1 : 0}
                disabled={disableTimeControlsUi}
                step="1"
                value={frameInput}
                onChange={(event) => {
                  setFrameInput(event.target.valueAsNumber);
                }}
              />
              <input
                type="number"
                min="0"
                max={dataset ? dataset.numberOfFrames - 1 : 0}
                disabled={disableTimeControlsUi}
                value={frameInput}
                onChange={(event) => {
                  setFrame(event.target.valueAsNumber);
                }}
              />
            </div>
          </div>

          <div>
            Find by track:
            <input
              disabled={disableUi}
              type="number"
              value={findTrackInput}
              onChange={(event) => {
                setFindTrackInput(event.target.value);
              }}
            />
            <button disabled={disableUi} onClick={handleFindTrack}>
              Find
            </button>
          </div>
        </div>

        {/* Hover values */}
        <div>
          <p>Track ID: {hoveredId ? dataset?.getTrackId(hoveredId) : ""}</p>
          <p>Feature: {hoveredId ? getFeatureValue(hoveredId) : ""}</p>
          <label>
            <input
              type="checkbox"
              checked={showTrackPath}
              onChange={() => {
                setShowTrackPath(!showTrackPath);
              }}
            />
            Show track path
          </label>
        </div>
      </div>

      <div ref={plotRef} style={{ width: "600px", height: "250px" }}></div>

      <div>
        <p>CHANGE BROWSER DOWNLOAD SETTINGS BEFORE USE:</p>
        <p>1) Set your default download location</p>
        <p>2) Turn off 'Ask where to save each file before downloading'</p>
        <br />
        <p>Save image sequence:</p>
        <button
          onClick={() => recordingControls.start(imagePrefix, startAtFirstFrame)}
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
              value={imagePrefix}
              onChange={(event) => {
                // TODO: Check for illegal characters
                setImagePrefix(event.target.value);
                setUseDefaultPrefix(false);
              }}
            />
          </label>
          <button
            onClick={() => {
              setUseDefaultPrefix(true);
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
    </div>
  );
}

export default App;
