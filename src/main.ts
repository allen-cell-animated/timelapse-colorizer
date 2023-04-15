import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset } from "./colorizer";

const canv = new ColorizeCanvas();
const dataset = new Dataset("http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data/mama_bear");
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);

let currentFrame = 0;

// Esri color ramps - Blue 14
const colorStops = ["#3a4d6b", "#3d6da2", "#799a96", "#ccbe6a", "#ffec99"] as HexColorString[];
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
  window.addEventListener("keyup", handleKey);
  // drawLoop();
}

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

function handleKey({ key }: KeyboardEvent): void {
  if (key === "Left" || key === "ArrowLeft") {
    currentFrame = (currentFrame - 1 + dataset.numberOfFrames) % dataset.numberOfFrames;
    drawFrame(currentFrame);
  } else if (key === "Right" || key === "ArrowRight") {
    currentFrame = (currentFrame + 1) % dataset.numberOfFrames;
    drawFrame(currentFrame);
  }
}

async function drawLoop(): Promise<void> {
  await drawFrame(currentFrame);
  currentFrame = (currentFrame + 1) % dataset.numberOfFrames;
  window.requestAnimationFrame(drawLoop);
}

window.addEventListener("beforeunload", () => canv.dispose());
start();
