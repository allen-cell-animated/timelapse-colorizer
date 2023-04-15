import ColorizeCanvas from "./colorizer/ColorizeCanvas";
import Dataset from "./colorizer/Dataset";

const canv = new ColorizeCanvas();
const dataset = new Dataset("http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data/mama_bear");
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);
canv.render();

const MAX_FRAME = 100;
let currentFrame = 0;

async function start(): Promise<void> {
  await dataset.open();
  const firstFeature = dataset.featureNames[0];
  canv.setSize(window.innerWidth, window.innerHeight);
  canv.setDataset(dataset);
  canv.setFeature(firstFeature);
  await drawFrame(0);
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
