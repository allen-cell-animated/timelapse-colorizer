import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset } from "./colorizer";

const canv = new ColorizeCanvas();
const dataset = new Dataset("http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data/mama_bear");
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);

let currentFrame = 0;

// https://developers.arcgis.com/javascript/latest/visualization/symbols-color-ramps/esri-color-ramps/
// Esri color ramps - Blue 14
const colorStops: HexColorString[] = ["#3a4d6b", "#3d6da2", "#799a96", "#ccbe6a", "#ffec99"];
const colorRamp = new ColorRamp(colorStops);
canv.setColorRamp(colorRamp);

async function start(): Promise<void> {
  await dataset.open();
  const firstFeature = dataset.featureNames[0];
  canv.setSize(window.innerWidth, window.innerHeight);
  canv.setDataset(dataset);
  canv.setFeature(firstFeature);
  await drawFrame(0);
  window.addEventListener("resize", () => {
    canv.setSize(window.innerWidth, window.innerHeight);
    canv.render();
  });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  // drawLoop();
}

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

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

async function drawLoop(): Promise<void> {
  drawLoopRunning = true;
  if ((leftArrowDown || rightArrowDown) && !(leftArrowDown && rightArrowDown)) {
    await drawFrame(currentFrame);
    const delta = leftArrowDown ? -1 : 1;
    currentFrame = (currentFrame + delta + dataset.numberOfFrames) % dataset.numberOfFrames;
    window.requestAnimationFrame(drawLoop);
  } else {
    drawLoopRunning = false;
  }
}

window.addEventListener("beforeunload", () => canv.dispose());
start();
