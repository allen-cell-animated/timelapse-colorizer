import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset } from "./colorizer";

const baseUrl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";

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

function populateColorRampSelect(): void {
  colorRampSelectEl.innerHTML = "";
  colorRamps.forEach((ramp, idx) => {
    const rampCanvas = ramp.createGradientCanvas(120, 25);
    if (idx === 4) {
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

async function loadDataset(name: string): Promise<void> {
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
  await drawFrame(0);

  featureSelectEl.innerHTML = "";
  dataset.featureNames.forEach((feature) => addOptionTo(featureSelectEl, feature));

  datasetOpen = true;
  datasetSelectEl.disabled = false;
  featureSelectEl.disabled = false;
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
    window.requestAnimationFrame(drawLoop);
  } else {
    drawLoopRunning = false;
  }
}

async function start(): Promise<void> {
  setSize();
  populateColorRampSelect();
  canv.setColorRamp(colorRamps[0]);
  await loadDataset("mama_bear");

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  datasetSelectEl.addEventListener("change", handleDatasetChange);
  featureSelectEl.addEventListener("change", handleFeatureChange);
  colorRampSelectEl.addEventListener("click", handleColorRampClick);
}

window.addEventListener("beforeunload", () => canv.dispose());
window.addEventListener("resize", () => {
  setSize();
  canv.render();
});
start();
