import { HexColorString } from "three";
import { ColorizeCanvas, ColorRamp, Dataset, Track, Plotting } from "./colorizer";

const baseUrl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";

const plot = new Plotting("plot");
const canv = new ColorizeCanvas();
document.querySelector<HTMLDivElement>("#app")!.appendChild(canv.domElement);

const datasetSelectEl: HTMLSelectElement = document.querySelector("#dataset")!;
const featureSelectEl: HTMLSelectElement = document.querySelector("#feature")!;
const colorRampSelectEl: HTMLSelectElement = document.querySelector("#color_ramp")!;
const colorRampContainerEl: HTMLDivElement = document.querySelector("#color_ramp_container")!;
const colorRampMinEl: HTMLLabelElement = document.querySelector("#color_ramp_min")!;
const colorRampMaxEl: HTMLLabelElement = document.querySelector("#color_ramp_max")!;
let colorRampMin: number = 0;
let colorRampMax: number = 0;
const trackInput: HTMLInputElement = document.querySelector("#trackValue")!;
const findTrackBtn: HTMLButtonElement = document.querySelector("#findTrackBtn")!;
const lockRangeCheckbox: HTMLInputElement = document.querySelector("#lock_range_checkbox")!;

// time / playback controls
class TimeControls {
  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private timeSlider: HTMLInputElement;
  private timeInput: HTMLInputElement;

  private totalFrames: number;
  private currentFrame: number;
  private timerId: number;
  private redrawfn: () => void;

  constructor(redrawfn: () => void) {
    this.redrawfn = redrawfn;
    this.totalFrames = 0;
    this.currentFrame = 0;
    this.timerId = 0;
    this.playBtn = document.querySelector("#playBtn")!;
    this.pauseBtn = document.querySelector("#pauseBtn")!;
    this.forwardBtn = document.querySelector("#forwardBtn")!;
    this.backBtn = document.querySelector("#backBtn")!;
    this.timeSlider = document.querySelector("#timeSlider")!;
    this.timeInput = document.querySelector("#timeValue")!;
    this.playBtn.addEventListener("click", () => this.handlePlayButtonClick());
    this.pauseBtn.addEventListener("click", () => this.handlePauseButtonClick());
    this.forwardBtn.addEventListener("click", () => this.handleFrameAdvance(1));
    this.backBtn.addEventListener("click", () => this.handleFrameAdvance(-1));
    // only update when DONE sliding: change event
    this.timeSlider.addEventListener("change", () => this.handleTimeSliderChange());
    this.timeInput.addEventListener("change", () => this.handleTimeInputChange());
  }

  private playTimeSeries(onNewFrameCallback: () => void): void {
    clearInterval(this.timerId);

    const loadNextFrame = (): void => {
      let nextFrame = this.currentFrame + 1;
      if (nextFrame >= this.totalFrames) {
        nextFrame = 0;
      }

      // do the necessary update
      this.redrawfn();
      this.currentFrame = nextFrame;
      onNewFrameCallback();
    };
    this.timerId = window.setInterval(loadNextFrame, 40);
  }

  private goToFrame(targetFrame: number): boolean {
    const wrap = true;
    // wrap around is ok
    if (wrap) {
      this.currentFrame = (targetFrame + this.totalFrames) % this.totalFrames;
      return true;
    }

    console.log("going to Frame " + targetFrame);
    const outOfBounds = targetFrame > this.totalFrames - 1 || targetFrame < 0;
    if (outOfBounds) {
      console.log(`frame ${targetFrame} out of bounds`);
      return false;
    }

    // check to see if we have pre-cached the frame, else load it...
    //     f(targetFrame);

    this.currentFrame = targetFrame;
    return true;
  }

  private handlePlayButtonClick(): void {
    if (this.currentFrame >= this.totalFrames - 1) {
      this.currentFrame = -1;
    }
    this.playTimeSeries(() => {
      if (this.timeInput) {
        this.timeInput.value = "" + this.currentFrame;
      }
      if (this.timeSlider) {
        this.timeSlider.value = "" + this.currentFrame;
      }
    });
  }
  private handlePauseButtonClick(): void {
    clearInterval(this.timerId);
  }
  public handleFrameAdvance(delta: number = 1): void {
    this.setCurrentFrame(this.currentFrame + delta);
  }
  private handleTimeSliderChange(): void {
    // trigger loading new time
    if (this.goToFrame(this.timeSlider.valueAsNumber)) {
      this.timeInput.value = this.timeSlider.value;
      this.redrawfn();
    }
  }
  private handleTimeInputChange(): void {
    // trigger loading new time
    if (this.goToFrame(this.timeInput.valueAsNumber)) {
      // update slider
      this.timeSlider.value = this.timeInput.value;
      this.redrawfn();
    }
  }

  public updateTotalFrames(totalFrames: number): void {
    this.totalFrames = totalFrames;
    this.timeSlider.max = `${totalFrames - 1}`;
    this.timeInput.max = `${totalFrames - 1}`;

    if (totalFrames < 2) {
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = true;
    } else {
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = false;
    }
  }

  /**
   * Attempts to set the current frame. If frame is updated, updates the time control UI and
   * triggers a redraw.
   * @returns true if the frame was set correctly (false if the frame is out of range).
   */
  public setCurrentFrame(frame: number): boolean {
    if (this.goToFrame(frame)) {
      this.redrawfn();
      // Update time slider fields
      this.timeSlider.value = "" + this.currentFrame;
      this.timeInput.value = "" + this.currentFrame;
      return true;
    }
    return false;
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }
}
const timeControls = new TimeControls(drawLoop);

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
  const width = 120, height = 25;
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

// DATASET LOADING ///////////////////////////////////////////////////////

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
  await dataset.open();
  timeControls.updateTotalFrames(dataset.numberOfFrames);
  timeControls.setCurrentFrame(0);
  resetTrackUI();

  // Only change the feature if there's no equivalent in the new dataset
  if (!dataset.featureNames.includes(featureName)) {
    featureName = dataset.featureNames[0];
  }

  canv.setDataset(dataset);
  updateFeature(featureName);
  plot.setDataset(dataset);
  plot.removePlot();
  await drawFrame(0);

  featureSelectEl.innerHTML = "";
  dataset.featureNames.forEach((feature) => addOptionTo(featureSelectEl, feature));
  featureSelectEl.value = featureName;

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
  console.log(value);
  updateFeature(value);
}

function updateFeature(newFeatureName: string): void {
  const featureData = canv.getFeatureData(newFeatureName);
  if (!featureData) {
    return;
  }
  featureName = newFeatureName;
  // TODO: Decide if feature range should be unlocked when the feature changes.
  // Don't update the range values when locked
  if (!lockRangeCheckbox.checked) {
    colorRampMin = featureData.min;
    colorRampMax = featureData.max;
  }

  canv.setFeature(featureData.tex, colorRampMin, colorRampMax);
  canv.render();
  // only update plot if active
  if (selectedTrack) {
    plot.plot(selectedTrack, featureName, timeControls.getCurrentFrame());
  }
  colorRampMinEl.innerText = `${colorRampMin}`;
  colorRampMaxEl.innerText = `${colorRampMax}`;
}

function handleLockRangeCheckboxChange(): void {
  // When the lock is disabled, reset the color ramp min and max to match the
  // currently selected feature.
  if (!lockRangeCheckbox.checked) {
    updateFeature(featureName);
  }
}

function handleCanvasClick(event: MouseEvent): void {
  const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
  console.log("clicked id " + id);
  canv.setHighlightedId(id);
  canv.render();
  // Reset track input
  resetTrackUI();
  if (id < 0) {
    selectedTrack = null;
    plot.removePlot();
    return;
  }
  const trackId = dataset!.getTrackId(id);
  selectedTrack = dataset!.buildTrack(trackId);
  plot.plot(selectedTrack, featureName, timeControls.getCurrentFrame());
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
  const trackId = trackInput.valueAsNumber;
  const newTrack = dataset!.buildTrack(trackId);

  if (newTrack.length() < 1) {  // Check track validity
    return;
  }
  selectedTrack = newTrack;
  timeControls.setCurrentFrame(selectedTrack.times[0]);
  plot.plot(selectedTrack, featureName, timeControls.getCurrentFrame());
}

function resetTrackUI(): void {
  trackInput.value = "";
}

// SETUP & DRAWING ///////////////////////////////////////////////////////

const setSize = (): void => canv.setSize(Math.min(window.innerWidth, 730), Math.min(window.innerHeight, 500));

async function drawFrame(index: number): Promise<void> {
  await canv.setFrame(index);
  canv.render();
}

async function drawLoop(): Promise<void> {
  if (dataset && datasetOpen) {
    // update higlighted cell id if any
    if (selectedTrack) {
      const id = selectedTrack.getIdAtTime(timeControls.getCurrentFrame());
      canv.setHighlightedId(id - 1);
      // console.log(`selected track: ${selectedTrack.trackId}; highlighted id ${id}`);
    }
    // update current time in plot
    plot.setTime(timeControls.getCurrentFrame());
    await drawFrame(timeControls.getCurrentFrame());
  }
}

async function start(): Promise<void> {
  setSize();
  populateColorRampSelect();
  canv.setColorRamp(colorRamps[DEFAULT_RAMP]);
  await loadDataset("mama_bear");

  window.addEventListener("keydown", handleKeyDown);
  datasetSelectEl.addEventListener("change", handleDatasetChange);
  featureSelectEl.addEventListener("change", handleFeatureChange);
  colorRampSelectEl.addEventListener("click", handleColorRampClick);
  canv.domElement.addEventListener("click", handleCanvasClick);
  findTrackBtn.addEventListener("click", () => handleFindTrack());
  trackInput.addEventListener("change", () => handleFindTrack());
  lockRangeCheckbox.addEventListener("change", () => handleLockRangeCheckboxChange());
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
