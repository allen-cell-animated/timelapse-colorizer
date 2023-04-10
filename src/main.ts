import Dataset from "./colorizer/Dataset";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = "<div>Hello world!</div>";

const dataset = new Dataset("scripts/data/dataset0");
dataset.open().then(() => console.log(dataset));
