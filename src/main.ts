import ColorizeCanvas from "./colorizer/ColorizeCanvas";
import Dataset from "./colorizer/Dataset";

const canv = new ColorizeCanvas();
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.getCanvas());
canv.render();

const dataset = new Dataset("scripts/data/dataset0");
dataset.open().then(() => console.log(dataset));
