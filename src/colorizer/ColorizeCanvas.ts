import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  GLSL3,
  Line,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAIntegerFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

import ColorRamp from "./ColorRamp";
import Dataset from "./Dataset";
import { FeatureDataType } from "./types";
import { packDataTexture } from "./utils/texture_utils";
import vertexShader from "./shaders/colorize.vert";
import fragmentShader from "./shaders/colorize_RGBA8U.frag";
import pickFragmentShader from "./shaders/cellId_RGBA8U.frag";
import lineVertexShader from "./shaders/line.vert";
import lineFragmentShader from "./shaders/line.frag";
import Track from "./Track";

const BACKGROUND_COLOR_DEFAULT = 0xf7f7f7;
const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;
const SELECTED_COLOR_DEFAULT = 0xff00ff; // ARGB

type ColorizeUniformTypes = {
  aspect: number;
  frame: Texture;
  featureData: Texture;
  outlierData: Texture;
  featureMin: number;
  featureMax: number;
  colorRamp: Texture;
  backgroundColor: Color;
  outlierColor: Color;
  highlightedId: number;
  hideOutOfRange: boolean;
};

type LineUniformTypes = {
  aspect: number;
  frame: Texture;
  color: Color;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

type LineUniforms = { [K in keyof LineUniformTypes]: Uniform<LineUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  const emptyFeature = packDataTexture([0], FeatureDataType.F32);
  const emptyOutliers = packDataTexture([0], FeatureDataType.U8);
  const emptyColorRamp = new ColorRamp(["black"]).texture;

  return {
    aspect: new Uniform(2),
    frame: new Uniform(emptyFrame),
    featureData: new Uniform(emptyFeature),
    outlierData: new Uniform(emptyOutliers),
    featureMin: new Uniform(0),
    featureMax: new Uniform(1),
    colorRamp: new Uniform(emptyColorRamp),
    backgroundColor: new Uniform(new Color(BACKGROUND_COLOR_DEFAULT)),
    outlierColor: new Uniform(new Color(OUTLIER_COLOR_DEFAULT)),
    highlightedId: new Uniform(-1),
    hideOutOfRange: new Uniform(false),
  };
};

const getDefaultLineUniforms = (): LineUniforms => {
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  return {
    aspect: new Uniform(2),
    frame: new Uniform(emptyFrame),
    color: new Uniform(new Color(SELECTED_COLOR_DEFAULT)),
  };
};

export default class ColorizeCanvas {
  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private pickMaterial: ShaderMaterial;
  private mesh: Mesh;
  private pickMesh: Mesh;

  // Rendered track line that shows the trajectory of a cell.
  private lineGeometry: BufferGeometry;
  private lineMaterial: ShaderMaterial;
  private line: Line;
  private showTrackPath: boolean;

  private scene: Scene;
  private pickScene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private pickRenderTarget: WebGLRenderTarget;

  private dataset: Dataset | null;
  private track: Track | null;
  private points: Float32Array;
  private frameResolution: Vector2 | null;

  private featureName: string | null;
  private colorMapRangeLocked: boolean;
  private hideValuesOutOfRange: boolean;
  private colorMapRangeMin: number;
  private colorMapRangeMax: number;
  private currentFrame: number;

  constructor() {
    this.geometry = new PlaneGeometry(2, 2);
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: getDefaultUniforms(),
      depthWrite: false,
      depthTest: false,
      glslVersion: GLSL3,
    });
    this.pickMaterial = new ShaderMaterial({
      vertexShader,
      fragmentShader: pickFragmentShader,
      uniforms: getDefaultUniforms(),
      depthWrite: false,
      depthTest: false,
      glslVersion: GLSL3,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.pickMesh = new Mesh(this.geometry, this.pickMaterial);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new Scene();
    this.scene.add(this.mesh);
    this.pickScene = new Scene();
    this.pickScene.add(this.pickMesh);

    // Configure lines
    this.points = new Float32Array([0, 0, 0]);

    this.lineGeometry = new BufferGeometry();
    this.lineGeometry.setAttribute("position", new BufferAttribute(this.points, 3));
    this.lineMaterial = new ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      uniforms: getDefaultLineUniforms(),
      depthWrite: false,
      depthTest: false,
      glslVersion: GLSL3,
    });

    this.line = new Line(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.line);

    this.pickRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    });
    this.renderer = new WebGLRenderer();
    this.checkPixelRatio();

    this.dataset = null;
    this.frameResolution = null;
    this.featureName = null;
    this.track = null;
    this.showTrackPath = false;
    this.colorMapRangeLocked = false;
    this.hideValuesOutOfRange = false;
    this.colorMapRangeMin = 0;
    this.colorMapRangeMax = 0;
    this.currentFrame = 0;
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private checkPixelRatio(): void {
    if (this.renderer.getPixelRatio() !== window.devicePixelRatio) {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
  }

  setSize(width: number, height: number): void {
    this.checkPixelRatio();
    this.setUniform("aspect", width / height);
    this.setLineUniform("aspect", width / height);
    this.renderer.setSize(width, height);
    // TODO: either make this a 1x1 target and draw it with a new camera every time we pick,
    // or keep it up to date with the canvas on each redraw (and don't draw to it when we pick!)
    this.pickRenderTarget.setSize(width, height);
  }

  public async setDataset(dataset: Dataset): Promise<void> {
    if (this.dataset !== null) {
      this.dataset.dispose();
    }
    this.dataset = dataset;
    if (this.dataset.outliers) {
      this.setUniform("outlierData", this.dataset.outliers);
    } else {
      this.setUniform("outlierData", packDataTexture([0], FeatureDataType.U8));
    }

    // Force load of frame data (clear cached frame data)
    const frame = await this.dataset?.loadFrame(this.currentFrame);
    if (!frame) {
      return;
    }
    // Save frame resolution for later calculation
    this.frameResolution = new Vector2(frame.image.width, frame.image.height);
    this.setUniform("frame", frame);
    this.setLineUniform("frame", frame);
    this.render();
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
    this.pickMaterial.uniforms[name].value = value;
  }

  private setLineUniform<U extends keyof LineUniformTypes>(name: U, value: LineUniformTypes[U]): void {
    this.lineMaterial.uniforms[name].value = value;
  }

  setColorRamp(ramp: ColorRamp): void {
    this.setUniform("colorRamp", ramp.texture);
  }

  setBackgroundColor(color: Color): void {
    this.setUniform("backgroundColor", color);
  }

  setOutlierColor(color: Color): void {
    this.setUniform("outlierColor", color);
  }

  setSelectedTrack(track: Track | null): void {
    console.log("Setting track:");
    console.log(track);
    if (this.track?.trackId === track?.trackId) {
      return;
    }
    this.track = track;
    if (!track || !track.centroids || track.centroids.length === 0 || !this.frameResolution) {
      return;
    }

    // Make a new array of the centroid positions,
    // normalizing to screen space.
    // We need three floats per coordinate
    this.points = new Float32Array(track.centroids.length * 3);
    for (let i = 0; i < track.centroids.length; i++) {
      // Screen space is in [-1, 1] range.
      this.points[3 * i + 0] = (track.centroids[i][0] / (4.0 * this.frameResolution.x)) * 2.0 - 1.0;
      this.points[3 * i + 1] = -((track.centroids[i][1] / (4.0 * this.frameResolution.y)) * 2.0 - 1.0);
      this.points[3 * i + 2] = 0;
    }
    console.log(this.frameResolution);
    console.log(this.points);
    // Assign new BufferAttribute because the old array has been discarded.
    this.line.geometry.setAttribute("position", new BufferAttribute(this.points, 3));
    this.line.geometry.getAttribute("position").needsUpdate = true;
    this.updateTrackRange();
    this.render();
  }

  setShowTrackPath(show: boolean): void {
    this.showTrackPath = show;
  }

  /**
   * Updates the range of the track path line based on the current frame.
   */
  updateTrackRange(): void {
    if (!this.track) {
      return;
    }
    if (!this.showTrackPath) {
      // Hide path
      this.line.geometry.setDrawRange(0, 0);
      return;
    }
    const trackFirstFrame = this.track.times[0];
    const range = Math.min(this.currentFrame - trackFirstFrame, this.track.length());
    this.line.geometry.setDrawRange(0, range);
  }

  private updateHighlightedId(): void {
    // Get highlighted id
    if (this.track) {
      let id;
      // Tracks of length 1 should not be offset by 1
      if (this.track.length() === 1) {
        id = this.track.getIdAtTime(this.currentFrame);
      } else {
        id = this.track.getIdAtTime(this.currentFrame) - 1;
      }
      this.setUniform("highlightedId", id);
    }
  }

  setFeature(name: string): void {
    if (!this.dataset?.hasFeature(name)) {
      return;
    }
    const featureData = this.dataset.getFeatureData(name)!;
    this.featureName = name;
    this.setUniform("featureData", featureData.tex);
    // Don't update the range values when locked
    // TODO: Decide if feature range should be unlocked when the feature changes.
    if (!this.colorMapRangeLocked) {
      this.colorMapRangeMin = featureData.min;
      this.colorMapRangeMax = featureData.max;
    }
    this.setUniform("featureMin", this.colorMapRangeMin);
    this.setUniform("featureMax", this.colorMapRangeMax);
    this.render(); // re-render necessary because map range may have changed
  }

  setColorMapRangeLock(locked: boolean): void {
    this.colorMapRangeLocked = locked;
  }

  isColorMapRangeLocked(): boolean {
    return this.colorMapRangeLocked;
  }

  setHideValuesOutOfRange(hide: boolean): void {
    this.hideValuesOutOfRange = hide;
    this.setUniform("hideOutOfRange", this.hideValuesOutOfRange);
  }

  setColorMapRangeMin(newMin: number): void {
    this.colorMapRangeMin = newMin;
    this.setUniform("featureMin", this.colorMapRangeMin);
  }

  setColorMapRangeMax(newMax: number): void {
    this.colorMapRangeMax = newMax;
    this.setUniform("featureMax", this.colorMapRangeMax);
  }

  resetColorMapRange(): void {
    if (!this.featureName) {
      return;
    }
    const featureData = this.dataset?.getFeatureData(this.featureName);
    if (featureData) {
      this.colorMapRangeMin = featureData.min;
      this.colorMapRangeMax = featureData.max;
      this.setUniform("featureMin", this.colorMapRangeMin);
      this.setUniform("featureMax", this.colorMapRangeMax);
    }
  }

  getColorMapRangeMin(): number {
    return this.colorMapRangeMin;
  }

  getColorMapRangeMax(): number {
    return this.colorMapRangeMax;
  }

  /**
   * @returns The number of frames in the dataset. If no dataset is loaded,
   * returns 0 by default.
   */
  getTotalFrames(): number {
    return this.dataset ? this.dataset.numberOfFrames : 0;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  public isValidFrame(index: number): boolean {
    return index >= 0 && index < this.getTotalFrames();
  }

  /**
   * Sets the current frame of the canvas, loading the new frame data if the
   * frame number changes.
   * @param index Index of the new frame.
   */
  async setFrame(index: number): Promise<void> {
    // Ignore same or bad frame indices
    if (this.currentFrame === index || !this.isValidFrame(index)) {
      return;
    }
    // New frame, so load the frame data.
    this.currentFrame = index;
    const frame = await this.dataset?.loadFrame(index);
    if (!frame) {
      return;
    }
    this.setUniform("frame", frame);
  }

  render(): void {
    this.updateHighlightedId();
    this.updateTrackRange();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.dataset?.dispose();
    this.dataset = null;
    this.material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
  }

  getIdAtPixel(x: number, y: number): number {
    const rt = this.renderer.getRenderTarget();

    this.renderer.setRenderTarget(this.pickRenderTarget);
    this.renderer.render(this.pickScene, this.camera);

    const pixbuf = new Uint8Array(4);
    this.renderer.readRenderTargetPixels(this.pickRenderTarget, x, this.pickRenderTarget.height - y, 1, 1, pixbuf);
    // restore main render target
    this.renderer.setRenderTarget(rt);

    // get 32bit value from 4 8bit values
    const value = pixbuf[0] | (pixbuf[1] << 8) | (pixbuf[2] << 16) | (pixbuf[3] << 24);
    // offset by 1 since 0 is background.
    return value - 1;
  }
}
