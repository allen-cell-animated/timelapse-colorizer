import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  CaretRightOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  PauseOutlined,
  StepBackwardFilled,
  StepForwardFilled,
} from "@ant-design/icons";
import { Button, Checkbox, notification, Slider, Tabs } from "antd";
import { NotificationConfig } from "antd/es/notification/interface";
import { Color } from "three";

import styles from "./App.module.css";
import { ColorizeCanvas, Dataset, Track } from "./colorizer";
import Collection from "./colorizer/Collection";
import { BACKGROUND_ID, DrawMode, OUTLIER_COLOR_DEFAULT, OUT_OF_RANGE_COLOR_DEFAULT } from "./colorizer/ColorizeCanvas";
import TimeControls from "./colorizer/TimeControls";
import { FeatureThreshold, isThresholdNumeric } from "./colorizer/types";
import { getColorMap, thresholdMatchFinder, validateThresholds } from "./colorizer/utils/data_utils";
import { numberToStringDecimal } from "./colorizer/utils/math_utils";
import { useConstructor, useDebounce } from "./colorizer/utils/react_utils";
import * as urlUtils from "./colorizer/utils/url_utils";
import AppStyle, { AppThemeContext } from "./components/AppStyle";
import CanvasWrapper from "./components/CanvasWrapper";
import CategoricalColorPicker from "./components/CategoricalColorPicker";
import ColorRampDropdown from "./components/ColorRampDropdown";
import Export from "./components/Export";
import HoverTooltip from "./components/HoverTooltip";
import IconButton from "./components/IconButton";
import LabeledDropdown from "./components/LabeledDropdown";
import LabeledRangeSlider from "./components/LabeledRangeSlider";
import LoadDatasetButton from "./components/LoadDatasetButton";
import PlaybackSpeedControl from "./components/PlaybackSpeedControl";
import SpinBox from "./components/SpinBox";
import { DEFAULT_CATEGORICAL_PALETTES, DEFAULT_CATEGORICAL_PALETTE_ID } from "./constants";
import FeatureThresholdsTab from "./components/tabs/FeatureThresholdsTab";
import PlotTab from "./components/tabs/PlotTab";
import SettingsTab from "./components/tabs/SettingsTab";
import { DEFAULT_COLLECTION_PATH, DEFAULT_COLOR_RAMPS, DEFAULT_COLOR_RAMP_ID, DEFAULT_PLAYBACK_FPS } from "./constants";

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

  const [selectedBackdropKey, setSelectedBackdropKey] = useState<string | null>(null);
  const [backdropBrightness, setBackdropBrightness] = useState<number>(100);
  const [backdropSaturation, setBackdropSaturation] = useState<number>(100);
  const [objectOpacity, setObjectOpacity] = useState(100);

  const [isInitialDatasetLoaded, setIsInitialDatasetLoaded] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);

  const colorRampData = DEFAULT_COLOR_RAMPS;
  const [colorRampKey, setColorRampKey] = useState(DEFAULT_COLOR_RAMP_ID);
  const [colorRampReversed, setColorRampReversed] = useState(false);
  const [colorRampMin, setColorRampMin] = useState(0);
  const [colorRampMax, setColorRampMax] = useState(0);
  const [outOfRangeDrawSettings, setOutOfRangeDrawSettings] = useState({
    mode: DrawMode.USE_COLOR,
    color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
  });
  const [outlierDrawSettings, setOutlierDrawSettings] = useState({
    mode: DrawMode.USE_COLOR,
    color: new Color(OUTLIER_COLOR_DEFAULT),
  });

  const [categoricalPalette, setCategoricalPalette] = useState(
    DEFAULT_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_ID)!.colors
  );

  const [featureThresholds, _setFeatureThresholds] = useState<FeatureThreshold[]>([]);
  const setFeatureThresholds = useCallback(
    // Change the current feature min + max on the color ramp if that feature's threshold moved.
    (newThresholds: FeatureThreshold[]): void => {
      // Check if the current feature is being thresholded on, and if that threshold
      // has changed. If so, snap the current min + max color ramp values so they match the new
      // threshold values.
      const featureData = dataset?.getFeatureData(featureName);
      if (featureData) {
        const oldThreshold = featureThresholds.find(thresholdMatchFinder(featureName, featureData.units));
        const newThreshold = newThresholds.find(thresholdMatchFinder(featureName, featureData.units));

        if (newThreshold && oldThreshold && isThresholdNumeric(newThreshold)) {
          setColorRampMin(newThreshold.min);
          setColorRampMax(newThreshold.max);
        }
      }
      _setFeatureThresholds(newThresholds);
    },
    [featureThresholds, featureName]
  );

  const [playbackFps, setPlaybackFps] = useState(DEFAULT_PLAYBACK_FPS);
  const [isColorRampRangeLocked, setIsColorRampRangeLocked] = useState(false);
  const [showTrackPath, setShowTrackPath] = useState(false);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);

  // Provides a mounting point for Antd's notification component. Otherwise, the notifications
  // are mounted outside of App and don't receive CSS styling variables.
  const notificationContainer = useRef<HTMLDivElement>(null);
  const notificationConfig: NotificationConfig = {
    getContainer: () => notificationContainer.current as HTMLElement,
  };
  const [notificationApi, notificationContextHolder] = notification.useNotification(notificationConfig);

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
      return { datasetParam: datasetKey, collectionParam: collection?.url };
    }
  }, [datasetKey, dataset, collection]);

  /**
   * Get the optional color map feature range parameter for the URL. If the range
   * is the full range of the feature's values (default), return undefined.
   */
  const getRangeParam = useCallback((): [number, number] | undefined => {
    if (!dataset) {
      return undefined;
    }
    // check if current selected feature range matches the default feature range; if so, don't provide
    // a range parameter..
    const featureData = dataset.getFeatureData(featureName);
    if (featureData) {
      if (featureData.min === colorRampMin && featureData.max === colorRampMax) {
        return undefined;
      }
    }
    return [colorRampMin, colorRampMax];
  }, [colorRampMin, colorRampMax, featureName, dataset]);

  /**
   * Get a URL query string representing the current collection, dataset, feature, track,
   * and frame information.
   */
  const getUrlParams = useCallback((): string => {
    const { datasetParam, collectionParam } = getDatasetAndCollectionParam();
    const rangeParam = getRangeParam();

    return urlUtils.paramsToUrlQueryString({
      collection: collectionParam,
      dataset: datasetParam,
      feature: featureName,
      track: selectedTrack?.trackId,
      // Ignore time=0 to reduce clutter
      time: currentFrame !== 0 ? currentFrame : undefined,
      thresholds: featureThresholds,
      range: rangeParam,
      colorRampKey: colorRampKey,
      colorRampReversed: colorRampReversed,
    });
  }, [
    getDatasetAndCollectionParam,
    getRangeParam,
    featureName,
    selectedTrack,
    currentFrame,
    featureThresholds,
    colorRampKey,
    colorRampReversed,
  ]);

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
  }, []);

  // Attempt to load database and collections data from the URL.
  // This is memoized so that it only runs one time on startup.
  useEffect(() => {
    const loadInitialDataset = async (): Promise<void> => {
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

      if (!datasetResult.loaded) {
        console.error(datasetResult.errorMessage);
        notificationApi["error"]({
          message: "Error loading dataset: ",
          description: datasetResult.errorMessage,
          placement: "bottomLeft",
          duration: 4,
        });
        return;
      }

      // TODO: The new dataset may be null if loading failed. See TODO in replaceDataset about expected behavior.
      if (!isInitialDatasetLoaded) {
        await replaceDataset(datasetResult.dataset, datasetKey);
        setIsInitialDatasetLoaded(true);
      }
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
    const setupInitialParameters = async (): Promise<void> => {
      if (initialUrlParams.thresholds) {
        if (dataset) {
          setFeatureThresholds(validateThresholds(dataset, initialUrlParams.thresholds));
        } else {
          setFeatureThresholds(initialUrlParams.thresholds);
        }
      }
      if (initialUrlParams.feature && dataset) {
        // Load feature (if unset, do nothing because replaceDataset already loads a default)
        await updateFeature(dataset, initialUrlParams.feature);
      }
      // Range, track, and time setting must be done after the dataset and feature is set.
      if (initialUrlParams.range) {
        setColorRampMin(initialUrlParams.range[0]);
        setColorRampMax(initialUrlParams.range[1]);
      }
      if (initialUrlParams.track && initialUrlParams.track >= 0) {
        // Highlight the track. Seek to start of frame only if time is not defined.
        findTrack(initialUrlParams.track, initialUrlParams.time !== undefined);
      }
      let newTime = currentFrame;
      if (initialUrlParams.time && initialUrlParams.time >= 0) {
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
      setSelectedBackdropKey(null);
      setSelectedTrack(null);
      setDatasetOpen(true);
      setFeatureThresholds(validateThresholds(newDataset, featureThresholds));
      console.log("Num Items:" + dataset?.numObjects);
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
          notificationApi["error"]({
            message: "Error loading dataset:",
            description: result.errorMessage,
            placement: "bottomLeft",
            duration: 4,
          });
        }
      }
    },
    [replaceDataset, collection, datasetKey]
  );

  /**
   * Attempt to load a URL provided in the Load menu.
   * The URL may either be a collection or a dataset, so handle it as an ambiguous URL.
   * @throws an error if the URL could not be loaded.
   * @returns the absolute path of the URL resource that was loaded.
   */
  const handleLoadRequest = useCallback(
    async (url: string): Promise<string> => {
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
      setFeatureThresholds([]); // Clear when switching collections
      await replaceDataset(loadResult.dataset, newDatasetKey);
      return newCollection.url || newCollection.getDefaultDatasetKey();
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
        // Use min/max from threshold if there is a matching one, otherwise use feature min/max
        const threshold = featureThresholds.find(thresholdMatchFinder(newFeatureName, featureData.units));
        if (threshold && isThresholdNumeric(threshold)) {
          setColorRampMin(threshold.min);
          setColorRampMax(threshold.max);
        } else {
          setColorRampMin(featureData.min);
          setColorRampMax(featureData.max);
        }
      }

      canv.setFeature(newFeatureName);
    },
    [isColorRampRangeLocked, colorRampMin, colorRampMax, canv, selectedTrack, currentFrame]
  );

  const getFeatureValue = useCallback(
    (id: number): string => {
      if (!featureName || !dataset) {
        return "";
      }
      // Look up feature value from id
      const featureData = dataset.getFeatureData(featureName);
      // ?? is a nullish coalescing operator; it checks for null + undefined values
      // (safe for falsy values like 0 or NaN, which are valid feature values)
      const featureValue = featureData?.data[id] ?? -1;
      const unitsLabel = featureData?.units ? ` ${featureData?.units}` : "";
      // Check if int, otherwise return float
      return numberToStringDecimal(featureValue, 3) + unitsLabel;
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

  const openCopyNotification = (): void => {
    navigator.clipboard.writeText(document.URL);
    notificationApi["success"]({
      message: "URL copied to clipboard",
      placement: "bottomLeft",
      duration: 4,
      icon: <CheckCircleOutlined style={{ color: theme.color.text.success }} />,
    });
  };

  const getFeatureDropdownData = useCallback((): string[] | { key: string; label: string }[] => {
    if (!dataset) {
      return [];
    }
    // Add units to the dataset feature names if present
    return dataset.featureNames.map((name) => {
      return { key: name, label: dataset.getFeatureNameWithUnits(name) };
    });
  }, [dataset]);

  const disableUi: boolean = isRecording || !datasetOpen;
  const disableTimeControlsUi = disableUi;

  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const getColorMapSliderMarks = (): undefined | number[] => {
    const featureData = dataset?.getFeatureData(featureName);
    if (!featureData || featureThresholds.length === 0) {
      return undefined;
    }
    const threshold = featureThresholds.find(thresholdMatchFinder(featureName, featureData.units));
    if (!threshold || !isThresholdNumeric(threshold)) {
      return undefined;
    }
    return [threshold.min, threshold.max];
  };

  let hoveredFeatureValue = "";
  if (lastHoveredId !== null && dataset) {
    const featureVal = getFeatureValue(lastHoveredId);
    const categories = dataset.getFeatureCategories(featureName);
    if (categories !== null) {
      hoveredFeatureValue = categories[Number.parseInt(featureVal, 10)];
    } else {
      hoveredFeatureValue = featureVal;
    }
  }

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
            items={getFeatureDropdownData()}
            onChange={(value) => {
              if (value !== featureName && dataset) {
                updateFeature(dataset, value);
              }
            }}
          />

          <ColorRampDropdown
            selectedRamp={colorRampKey}
            reversed={colorRampReversed}
            onChangeRamp={(name, reversed) => {
              setColorRampKey(name);
              setColorRampReversed(reversed);
            }}
            disabled={disableUi}
            useCategoricalPalettes={dataset?.isFeatureCategorical(featureName) || false}
            numCategories={dataset?.getFeatureCategories(featureName)?.length || 1}
            selectedPalette={categoricalPalette}
            onChangePalette={setCategoricalPalette}
          />
        </div>
        <div className={styles.headerRight}>
          <Button type="link" className={styles.copyUrlButton} onClick={openCopyNotification}>
            <LinkOutlined />
            Copy URL
          </Button>
          <Export
            totalFrames={dataset?.numberOfFrames || 0}
            setFrame={setFrameAndRender}
            getCanvas={() => canv.domElement}
            // Stop playback when exporting
            onClick={() => timeControls.handlePauseButtonClick()}
            currentFrame={currentFrame}
            defaultImagePrefix={datasetKey + "-" + featureName}
            disabled={dataset === null}
            setIsRecording={setIsRecording}
          />
          <LoadDatasetButton onRequestLoad={handleLoadRequest} currentResourceUrl={collection?.url || datasetKey} />
        </div>
      </div>

      {/** Main Content: Contains canvas and plot, ramp controls, time controls, etc. */}
      <div className={styles.mainContent}>
        {/** Top Control Bar */}
        <div className={styles.topControls}>
          <h3 style={{ margin: "0" }}>
            {dataset ? dataset.getFeatureNameWithUnits(featureName) : "Feature value range"}
          </h3>
          <div className={styles.controlsContainer}>
            {
              // Render either a categorical color picker or a range slider depending on the feature type
              dataset?.isFeatureCategorical(featureName) ? (
                <CategoricalColorPicker
                  categories={dataset.getFeatureCategories(featureName) || []}
                  selectedPalette={categoricalPalette}
                  onChangePalette={setCategoricalPalette}
                  disabled={disableUi}
                />
              ) : (
                <LabeledRangeSlider
                  min={colorRampMin}
                  max={colorRampMax}
                  minSliderBound={dataset?.getFeatureData(featureName)?.min}
                  maxSliderBound={dataset?.getFeatureData(featureName)?.max}
                  onChange={function (min: number, max: number): void {
                    setColorRampMin(min);
                    setColorRampMax(max);
                  }}
                  marks={getColorMapSliderMarks()}
                  disabled={disableUi}
                />
              )
            }
            {/** Additional top bar settings */}
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

        {/* Organize the main content areas */}
        <div className={styles.contentPanels}>
          <div className={styles.canvasPanel}>
            {/** Canvas */}
            <HoverTooltip
              tooltipContent={
                <>
                  <p>Track ID: {lastHoveredId && dataset?.getTrackId(lastHoveredId)}</p>
                  <p>
                    {featureName}: <span style={{ whiteSpace: "nowrap" }}>{hoveredFeatureValue}</span>
                  </p>
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
                colorRamp={getColorMap(colorRampData, colorRampKey, colorRampReversed)}
                colorRampMin={colorRampMin}
                colorRampMax={colorRampMax}
                categoricalColors={categoricalPalette}
                selectedTrack={selectedTrack}
                selectedBackdropKey={selectedBackdropKey}
                backdropBrightness={backdropBrightness}
                backdropSaturation={backdropSaturation}
                objectOpacity={objectOpacity}
                onTrackClicked={(track) => {
                  setFindTrackInput("");
                  setSelectedTrack(track);
                }}
                featureThresholds={featureThresholds}
                onMouseHover={(id: number): void => {
                  const isObject = id !== BACKGROUND_ID;
                  setShowHoveredId(isObject);
                  if (isObject) {
                    setLastHoveredId(id);
                  }
                }}
                onMouseLeave={() => setShowHoveredId(false)}
                showScaleBar={showScaleBar}
                showTimestamp={showTimestamp}
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
                  disabled={disableTimeControlsUi || timeControls.isPlaying()}
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
                items={[
                  {
                    label: "Plot",
                    key: "plot",
                    children: (
                      <div className={styles.tabContent}>
                        <PlotTab
                          findTrackInputText={findTrackInput}
                          setFindTrackInputText={setFindTrackInput}
                          findTrack={findTrack}
                          currentFrame={currentFrame}
                          dataset={dataset}
                          featureName={featureName}
                          selectedTrack={selectedTrack}
                          disabled={disableUi}
                        />
                      </div>
                    ),
                  },
                  {
                    label: "Filters",
                    key: "filter",
                    children: (
                      <div className={styles.tabContent}>
                        <FeatureThresholdsTab
                          featureThresholds={featureThresholds}
                          onChange={setFeatureThresholds}
                          dataset={dataset}
                          disabled={disableUi}
                          categoricalPalette={categoricalPalette}
                        />
                      </div>
                    ),
                  },
                  {
                    label: "Settings",
                    key: "settings",
                    children: (
                      <div className={styles.tabContent}>
                        <SettingsTab
                          // TODO: Refactor all of this into a settings or configuration object
                          outOfRangeDrawSettings={outOfRangeDrawSettings}
                          outlierDrawSettings={outlierDrawSettings}
                          showScaleBar={showScaleBar}
                          showTimestamp={showTimestamp}
                          dataset={dataset}
                          backdropBrightness={backdropBrightness}
                          backdropSaturation={backdropSaturation}
                          selectedBackdropKey={selectedBackdropKey}
                          setOutOfRangeDrawSettings={setOutOfRangeDrawSettings}
                          setOutlierDrawSettings={setOutlierDrawSettings}
                          setShowScaleBar={setShowScaleBar}
                          setShowTimestamp={setShowTimestamp}
                          setBackdropBrightness={setBackdropBrightness}
                          setBackdropSaturation={setBackdropSaturation}
                          setBackdropKey={setSelectedBackdropKey}
                          objectOpacity={objectOpacity}
                          setObjectOpacity={setObjectOpacity}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </AppStyle>
  );
}

export default App;
