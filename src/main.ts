import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset, Track, Plotting } from "./colorizer";
import RecordingControls from "./colorizer/RecordingControls";
import TimeControls from "./colorizer/TimeControls";
import {
  CollectionEntry,
  DEFAULT_COLLECTION_FILENAME,
  DEFAULT_COLLECTION_PATH,
  getCollectionData,
  isUrl,
  loadParamsFromUrl,
  saveParamsToUrl,
  getDefaultDatasetName,
  getExpectedDatasetPath,
} from "./colorizer/utils/url_utils";
import { BACKGROUND_ID } from "./colorizer/ColorizeCanvas";

const plot = new Plotting("plot");
const canv = new ColorizeCanvas();
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);

const datasetSelectEl: HTMLSelectElement = document.querySelector("#dataset")!;
const featureSelectEl: HTMLSelectElement = document.querySelector("#feature")!;
const colorRampSelectEl: HTMLSelectElement = document.querySelector("#color_ramp")!;
const colorRampContainerEl: HTMLDivElement = document.querySelector("#color_ramp_container")!;
const colorRampMinEl: HTMLInputElement = document.querySelector("#color_ramp_min")!;
const colorRampMaxEl: HTMLInputElement = document.querySelector("#color_ramp_max")!;
const trackInput: HTMLInputElement = document.querySelector("#trackValue")!;
const findTrackBtn: HTMLButtonElement = document.querySelector("#findTrackBtn")!;
const lockRangeCheckbox: HTMLInputElement = document.querySelector("#lock_range_checkbox")!;
const hideOutOfRangeCheckbox: HTMLInputElement = document.querySelector("#mask_range_checkbox")!;
const resetRangeBtn: HTMLButtonElement = document.querySelector("#reset_range_btn")!;

const timeControls = new TimeControls(canv, drawLoop);
const recordingControls = new RecordingControls(canv, drawLoop);

function addOptionTo(parent: HTMLSelectElement, value: string, child?: HTMLElement): void {
  const optionEl = document.createElement("option");
  optionEl.value = value;
  if (child) {
    optionEl.appendChild(child);
  } else {
    optionEl.innerHTML = value;
  }
  parent.appendChild(optionEl);
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

function populateColorRampSelect(): void {
  colorRampSelectEl.innerHTML = "";
  const width = 120,
    height = 25;
  // Sets dimensions for color ramp container, as color ramp isn't inline (absolute/floating)
  colorRampContainerEl.style.width = `${width}px`;
  colorRampContainerEl.style.height = `${height}px`;
  colorRamps.forEach((ramp, idx) => {
    const rampCanvas = ramp.createGradientCanvas(width, height);
    if (idx === DEFAULT_RAMP) {
      rampCanvas.className = "selected";
    }
    colorRampSelectEl.appendChild(rampCanvas);
  });
}

function setColorRampDisabled(disabled: boolean): void {
  colorRampSelectEl.className = disabled ? "disabled" : "";
}

// DATASET LOADING ///////////////////////////////////////////////////////

let collection: string;
let collectionData: Map<string, CollectionEntry>;
let dataset: Dataset | null = null;
let datasetName = "";
let datasetOpen = false;
let featureName = "";
let selectedTrack: Track | null = null;

async function loadDataset(name: string): Promise<void> {
  console.time("loadDataset");
  datasetOpen = false;
  const hasLoadedOtherDataset: boolean = dataset !== null && datasetName !== name;
  const lastDataset = datasetName;
  datasetSelectEl.disabled = true;
  featureSelectEl.disabled = true;

  if (dataset !== null) {
    dataset.dispose();
  }

  if (collectionData && !collectionData.has(name)) {
    console.warn(`Collection does not include '${name}' as a dataset. Defaulting to first dataset in the collection.`);
    name = getDefaultDatasetName(collectionData);
  }

  datasetName = name;
  datasetSelectEl.value = name;
  try {
    const datasetPath = getExpectedDatasetPath(name, collection, collectionData);

    console.log(`Fetching dataset from path '${datasetPath}'`);
    dataset = new Dataset(datasetPath);
    await dataset.open();
  } catch (e) {
    console.error(e);
    console.error(`Could not load dataset '${name}'.`);
    console.warn(`Reloading dataset '${lastDataset}' instead.`);
    console.timeEnd("loadDataset");
    if (hasLoadedOtherDataset) {
      // Re-load last dataset instead of this one
      await loadDataset(lastDataset);
    }
    return;
  }
  resetTrackUI();

  // Only change the feature if there's no equivalent in the new dataset
  if (!dataset.hasFeature(featureName)) {
    featureName = dataset.featureNames[0];
  }

  canv.setDataset(dataset);
  updateFeature(featureName);
  plot.setDataset(dataset);
  plot.removePlot();
  const newFrame = canv.getCurrentFrame() % canv.getTotalFrames();
  await canv.setFrame(newFrame);
  featureSelectEl.innerHTML = "";
  dataset.featureNames.forEach((feature) => addOptionTo(featureSelectEl, feature));
  featureSelectEl.value = featureName;
  datasetOpen = true;
  datasetSelectEl.disabled = false;
  featureSelectEl.disabled = false;
  await drawLoop();
  updateUrl();
  console.timeEnd("loadDataset");
}

// DISPLAY CONTROLS //////////////////////////////////////////////////////

function handleDatasetChange({ currentTarget }: Event): void {
  const value = (currentTarget as HTMLOptionElement).value;
  if (value !== datasetName) {
    loadDataset(value);
  }
}

function handleFeatureChange({ currentTarget }: Event): void {
  const value = (currentTarget as HTMLOptionElement).value;
  console.log(value);
  updateFeature(value);
}

async function updateFeature(newFeatureName: string): Promise<void> {
  if (!dataset?.hasFeature(newFeatureName)) {
    return;
  }
  featureName = newFeatureName;

  canv.setFeature(featureName);
  // only update plot if active
  if (selectedTrack) {
    plot.plot(selectedTrack, featureName, canv.getCurrentFrame());
  }
  updateColorRampRangeUI();
  featureSelectEl.value = featureName;
  updateUrl();
}

function handleHideOutOfRangeCheckboxChange(): void {
  canv.setHideValuesOutOfRange(hideOutOfRangeCheckbox.checked);
  drawLoop(); // force a render update in case elements should disappear.
}

async function handleResetRangeClick(): Promise<void> {
  canv.resetColorMapRange();
  updateColorRampRangeUI();
  await drawLoop(); // update UI
  colorRampMinEl.innerText = `${canv.getColorMapRangeMin()}`;
  colorRampMaxEl.innerText = `${canv.getColorMapRangeMax()}`;
}

function handleLockRangeCheckboxChange(): void {
  canv.setColorMapRangeLock(lockRangeCheckbox.checked);
  updateColorRampRangeUI();
}

function handleColorRampMinChanged(): void {
  canv.setColorMapRangeMin(colorRampMinEl.valueAsNumber);
  drawLoop();
  updateColorRampRangeUI();
}

function handleColorRampMaxChanged(): void {
  canv.setColorMapRangeMax(colorRampMaxEl.valueAsNumber);
  drawLoop();
  updateColorRampRangeUI();
}

function updateColorRampRangeUI(): void {
  colorRampMinEl.value = `${canv.getColorMapRangeMin()}`;
  colorRampMaxEl.value = `${canv.getColorMapRangeMax()}`;
}

async function handleCanvasClick(event: MouseEvent): Promise<void> {
  const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
  console.log("clicked id " + id);
  // Reset track input
  resetTrackUI();
  if (id < 0) {
    plot.removePlot();
    selectedTrack = null; // clear selected track when clicking off of cells
  } else {
    const trackId = dataset!.getTrackId(id);
    selectedTrack = dataset!.buildTrack(trackId);
    plot.plot(selectedTrack, featureName, canv.getCurrentFrame());
  }
  await drawLoop();
  updateUrl();
}

function handleColorRampClick({ target }: MouseEvent): void {
  Array.from(colorRampSelectEl.children).forEach((el, idx) => {
    if (el === target) {
      canv.setColorRamp(colorRamps[idx]);
      el.className = "selected";
    } else {
      el.className = "";
    }
  });
  canv.render();
}

// SCRUBBING CONTROLS ////////////////////////////////////////////////////

function handleKeyDown({ key }: KeyboardEvent): void {
  if (key === "ArrowLeft" || key === "Left") {
    timeControls.handleFrameAdvance(-1);
  } else if (key === "ArrowRight" || key === "Right") {
    timeControls.handleFrameAdvance(1);
  }
}

async function handleFindTrack(): Promise<void> {
  // Load track value
  await findTrack(trackInput.valueAsNumber);
}

async function findTrack(trackId: number): Promise<void> {
  const newTrack = dataset!.buildTrack(trackId);

  if (newTrack.length() < 1) {
    // Check track validity
    return;
  }
  selectedTrack = newTrack;
  await canv.setFrame(selectedTrack.times[0]);
  plot.plot(selectedTrack, featureName, canv.getCurrentFrame());
  await drawLoop();
  trackInput.value = "" + trackId;
  updateUrl();
}

function resetTrackUI(): void {
  trackInput.value = "";
}

// URL STATE /////////////////////////////////////////////////////////////
function updateUrl(): void {
  // Don't include collection parameter in URL if it matches the default.
  let collectionParam;
  if (
    collection === DEFAULT_COLLECTION_PATH ||
    collection === DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME
  ) {
    collectionParam = null;
  } else {
    collectionParam = collection;
  }

  saveParamsToUrl(
    collectionParam,
    datasetName,
    featureName,
    selectedTrack ? selectedTrack.trackId : null,
    canv.getCurrentFrame()
  );
}

// SETUP & DRAWING ///////////////////////////////////////////////////////

const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

async function drawLoop(): Promise<void> {
  if (dataset && datasetOpen) {
    // update higlighted cell id if any
    if (selectedTrack) {
      const id = selectedTrack.getIdAtTime(canv.getCurrentFrame());
      canv.setHighlightedId(id - 1);
    } else {
      canv.setHighlightedId(BACKGROUND_ID); // clear selection
    }
  }

  await canv.render();
  // Update UI Elements
  timeControls.setIsDisabled(recordingControls.isRecording());
  timeControls.updateUI();
  recordingControls.setIsDisabled(!dataset);
  recordingControls.setDefaultFilePrefix(`${datasetName}-${featureName}-`);
  recordingControls.updateUI();

  lockRangeCheckbox.checked = canv.isColorMapRangeLocked();

  const disableUI: boolean = recordingControls.isRecording() || !datasetOpen;
  setColorRampDisabled(disableUI);
  datasetSelectEl.disabled = disableUI;
  featureSelectEl.disabled = disableUI;
  findTrackBtn.disabled = disableUI;
  trackInput.disabled = disableUI;

  // update current time in plot
  plot.setTime(canv.getCurrentFrame());

  if (!timeControls.isPlaying()) {
    // Do not update URL while playing for performance + UX reasons
    updateUrl();
  }
}

async function start(): Promise<void> {
  setSize();
  populateColorRampSelect();
  canv.setColorRamp(colorRamps[DEFAULT_RAMP]);

  const params = loadParamsFromUrl();

  if (params.dataset && isUrl(params.dataset)) {
    // CASE 1: Dataset parameter is a URL
    // If dataset URL is provided, do not collect collections data, and add
    // the URL directly to the selector.
    const option = new Option(params.dataset);
    datasetSelectEl.appendChild(option);
    datasetSelectEl.value = params.dataset;
  } else {
    // CASE 2: Dataset parameter is not a URL
    // Set default collection value
    collection = params.collection || DEFAULT_COLLECTION_PATH;

    let collectionResults;
    try {
      collectionResults = await getCollectionData(params.collection);
    } catch (e) {
      console.error(e);
      datasetSelectEl.disabled = true;
      // TODO: Handle errors with an on-screen popup? This disables the UI entirely because no initialization is done.
      throw new Error(
        `The collection URL is invalid and the default collection data could not be loaded. Please check the collection URL '${collection}'.`
      );
    }

    collectionData = collectionResults;
    // Update list of datasets available
    for (const key of collectionData.keys()) {
      const option = new Option(key, key);
      datasetSelectEl.appendChild(option);
    }
  }

  // Load dataset
  if (params.dataset && isUrl(params.dataset)) {
    await loadDataset(params.dataset);
  } else {
    // Collections data is loaded.
    const defaultDataset = getDefaultDatasetName(collectionData);
    await loadDataset(params.dataset || defaultDataset);
  }

  if (params.feature) {
    // Load feature (if unset, do nothing because loadDataset already loads a default)
    await updateFeature(params.feature);
  }
  if (params.track >= 0) {
    // Seek to the track ID
    await findTrack(params.track);
  }
  if (params.time >= 0) {
    // Load time (if unset, defaults to track time or default t=0)
    await canv.setFrame(params.time);
    timeControls.updateUI();
  }
  await drawLoop(); // Force redraw to show the new frame

  window.addEventListener("keydown", handleKeyDown);
  datasetSelectEl.addEventListener("change", handleDatasetChange);
  featureSelectEl.addEventListener("change", handleFeatureChange);
  colorRampSelectEl.addEventListener("click", handleColorRampClick);
  canv.domElement.addEventListener("click", handleCanvasClick);
  findTrackBtn.addEventListener("click", () => handleFindTrack());
  trackInput.addEventListener("change", () => handleFindTrack());
  colorRampMinEl.addEventListener("change", () => handleColorRampMinChanged());
  colorRampMaxEl.addEventListener("change", () => handleColorRampMaxChanged());
  lockRangeCheckbox.addEventListener("change", () => handleLockRangeCheckboxChange());
  hideOutOfRangeCheckbox.addEventListener("change", () => handleHideOutOfRangeCheckboxChange());
  resetRangeBtn.addEventListener("click", handleResetRangeClick);
  recordingControls.setCanvas(canv);
  timeControls.addPauseListener(updateUrl);
}

window.addEventListener("beforeunload", () => {
  canv.domElement.removeEventListener("click", handleCanvasClick);
  canv.dispose();
});
window.addEventListener("resize", () => {
  setSize();
  canv.render();
});
start();
