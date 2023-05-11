import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset, Track, Plotting } from "./colorizer";

const baseUrl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";

const plot = new Plotting("plot");
const canv = new ColorizeCanvas();
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);

const datasetSelectEl: HTMLSelectElement = document.querySelector("#dataset")!;
const featureSelectEl: HTMLSelectElement = document.querySelector("#feature")!;
const colorRampSelectEl: HTMLSelectElement = document.querySelector("#color_ramp")!;

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
];
const colorRamps = colorStops.map((ramp) => new ColorRamp(ramp));
const DEFAULT_RAMP = 4;

function populateColorRampSelect(): void {
  colorRampSelectEl.innerHTML = "";
  colorRamps.forEach((ramp, idx) => {
    const rampCanvas = ramp.createGradientCanvas(120, 25);
    if (idx === DEFAULT_RAMP) {
      rampCanvas.className = "selected";
    }
    colorRampSelectEl.appendChild(rampCanvas);
  });
}

// DATASET LOADING ///////////////////////////////////////////////////////

let currentFrame = 0;

let dataset: Dataset | null = null;
let datasetName = "";
let datasetOpen = false;
let featureName = "";
let selectedTrack: Track | null = null;

async function loadDataset(name: string): Promise<void> {
  console.time("loadDataset");
  datasetOpen = false;
  datasetSelectEl.disabled = true;
  featureSelectEl.disabled = true;

  if (dataset !== null) {
    dataset.dispose();
  }

  datasetName = name;
  dataset = new Dataset(`${baseUrl}/${name}`);
  currentFrame = 0;
  await dataset.open();
  featureName = dataset.featureNames[0];
  canv.setDataset(dataset);
  canv.setFeature(featureName);
  plot.setDataset(dataset);
  await drawFrame(0);

  featureSelectEl.innerHTML = "";
  dataset.featureNames.forEach((feature) => addOptionTo(featureSelectEl, feature));

  datasetOpen = true;
  datasetSelectEl.disabled = false;
  featureSelectEl.disabled = false;
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
  canv.setFeature(value);
  canv.render();
  featureName = value;
  // only update plot if active
  if (selectedTrack) {
    plot.plot(selectedTrack, value, currentFrame);
  }
}

function handleCanvasClick(event: MouseEvent): void {
  const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
  console.log("clicked id " + id);
  canv.setHighlightedId(id);
  canv.render();
  if (id < 0) {
    selectedTrack = null;
    plot.removePlot();
    return;
  }
  const trackId = dataset!.getTrackId(id);
  selectedTrack = dataset!.buildTrack(trackId);
  plot.plot(selectedTrack, featureName, currentFrame);
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

let leftArrowDown = false;
let rightArrowDown = false;
let drawLoopRunning = false;

function handleKeyDown({ key, repeat }: KeyboardEvent): void {
  if (repeat) return;
  if (key === "ArrowLeft" || key === "Left") {
    leftArrowDown = true;
    if (!drawLoopRunning) drawLoop();
  } else if (key === "ArrowRight" || key === "Right") {
    rightArrowDown = true;
    if (!drawLoopRunning) drawLoop();
  }
}

function handleKeyUp({ key }: KeyboardEvent): void {
  if (key === "ArrowLeft" || key === "Left") {
    leftArrowDown = false;
    if (!drawLoopRunning) drawLoop();
  } else if (key === "ArrowRight" || key === "Right") {
    rightArrowDown = false;
    if (!drawLoopRunning) drawLoop();
  }
}

// SETUP & DRAWING ///////////////////////////////////////////////////////

const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

async function drawLoop(): Promise<void> {
  drawLoopRunning = true;
  const oneArrowDown = (leftArrowDown || rightArrowDown) && !(leftArrowDown && rightArrowDown);
  if (dataset && datasetOpen && oneArrowDown) {
    await drawFrame(currentFrame);
    const delta = leftArrowDown ? -1 : 1;
    currentFrame = (currentFrame + delta + dataset.numberOfFrames) % dataset.numberOfFrames;
    // update higlighted cell id if any
    if (selectedTrack) {
      const id = selectedTrack.getIdAtTime(currentFrame);
      canv.setHighlightedId(id - 1);
      // console.log(`selected track: ${selectedTrack.trackId}; highlighted id ${id}`);
    }
    // update current time in plot
    plot.setTime(currentFrame);

    window.requestAnimationFrame(drawLoop);
  } else {
    drawLoopRunning = false;
  }
}

async function start(): Promise<void> {
  setSize();
  populateColorRampSelect();
  canv.setColorRamp(colorRamps[DEFAULT_RAMP]);
  await loadDataset("mama_bear");

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  datasetSelectEl.addEventListener("change", handleDatasetChange);
  featureSelectEl.addEventListener("change", handleFeatureChange);
  colorRampSelectEl.addEventListener("click", handleColorRampClick);
  canv.domElement.addEventListener("click", handleCanvasClick);
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
