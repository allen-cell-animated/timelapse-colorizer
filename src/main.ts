import ColorizeCanvas from "./colorizer/ColorizeCanvas";
import Dataset from "./colorizer/Dataset";

const canv = new ColorizeCanvas();
const dataset = new Dataset("http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data/mama_bear");
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);
canv.render();

let currentFrame = 0;

async function start(): Promise<void> {
  await dataset.open();
  const firstFeature = dataset.featureNames[0];
  canv.setSize(window.innerWidth, window.innerHeight);
  canv.setDataset(dataset);
  canv.setFeature(firstFeature);
  // drawFrame(200);
  drawLoop();
}

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

async function drawLoop(): Promise<void> {
  await drawFrame(currentFrame);
  currentFrame = (currentFrame + 1) % dataset.numberOfFrames;
  // window.setTimeout(drawLoop, 500);
  window.requestAnimationFrame(drawLoop);
}

start();
