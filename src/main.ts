import ColorizeCanvas from "./colorizer/ColorizeCanvas";
import Dataset from "./colorizer/Dataset";

const canv = new ColorizeCanvas();
const dataset = new Dataset("scripts/data/dataset0");
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);
canv.render();

let currentFrame = 0;

async function start(): Promise<void> {
  await dataset.open();
  const firstFeature = Object.keys(dataset.features)[0];
  canv.setDataset(dataset);
  canv.setFeature(firstFeature);
  drawLoop();
}

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

function drawLoop(): void {
  drawFrame(currentFrame);
  currentFrame = (currentFrame + 1) % dataset.numberOfFrames;
  window.setTimeout(drawLoop, 500);
}

start();
