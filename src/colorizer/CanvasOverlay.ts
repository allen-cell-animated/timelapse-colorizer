import { OrthographicCamera, Scene } from "three";
// TODO: This is different from the way the documentation imports it (via addons rather than examples)
// https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import styles from "./CanvasOverlay.module.css";

const MIN_SCALE_BAR_WIDTH_PX = 80;

export default class CanvasOverlay {
  private renderer: CSS2DRenderer;
  private scene: Scene;
  private camera: OrthographicCamera;

  private scaleBar: HTMLDivElement;
  private scaleBarObject: CSS2DObject;

  constructor() {
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new Scene();
    this.renderer = new CSS2DRenderer();

    // Add scale bar
    this.scaleBar = document.createElement("div");
    this.scaleBar.className = styles.scaleBar;

    this.scaleBarObject = new CSS2DObject(this.scaleBar);
    this.scene.add(this.scaleBarObject);
    document.body.appendChild(this.renderer.domElement);
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height);
  }

  updateScaleBar(screenPixelsToUnits: number, unit: string): void {
    const minWidthUnits = MIN_SCALE_BAR_WIDTH_PX * screenPixelsToUnits;
    // Here we get the power of the most significant digit (MSD) of the minimum width in units.
    const msdPower = Math.ceil(Math.log10(minWidthUnits));

    // Get the nearest value in the place of the MSD that is greater than the minimum width.
    // This means that the displayed unit in the scale bar only changes at its MSD.
    // 0.1, 0.2, 0.3, ...
    // 1, 2, 3, ...
    // 10, 20, 30, ...
    const scaleBarWidthInUnits = Math.ceil(minWidthUnits / 10 ** (msdPower - 1)) * 10 ** (msdPower - 1);
    this.scaleBar.style.width = `${scaleBarWidthInUnits / screenPixelsToUnits}px`;

    // Fixes float error for unrepresentable values (0.30000000000004 => 0.3)
    const displayUnits =
      scaleBarWidthInUnits < 1 ? scaleBarWidthInUnits.toPrecision(1) : scaleBarWidthInUnits.toFixed(0);
    this.scaleBar.textContent = `${displayUnits} ${unit}`;
  }

  setScaleBarVisibility(visible: boolean): void {
    this.scaleBar.style.visibility = visible ? "visible" : "hidden";
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  get domElement(): HTMLElement {
    return this.renderer.domElement;
  }
}
