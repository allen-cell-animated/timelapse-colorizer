import {
  Color,
  DataTexture,
  GLSL3,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAIntegerFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform,
  UnsignedByteType,
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

const BACKGROUND_COLOR_DEFAULT = 0xf7f7f7;
const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;

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
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

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
  };
};

export default class ColorizeCanvas {
  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private pickMaterial: ShaderMaterial;
  private mesh: Mesh;
  private pickMesh: Mesh;

  private scene: Scene;
  private pickScene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private pickRenderTarget: WebGLRenderTarget;

  private dataset: Dataset | null;
  private featureName: string | null;
  private isColorMapRangeLocked: boolean;
  private colorMapRangeMin: number;
  private colorMapRangeMax: number;
  private currentFrame: number;
  private totalFrames: number;

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

    this.pickRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    });
    this.renderer = new WebGLRenderer();
    this.checkPixelRatio();

    this.dataset = null;
    this.featureName = null;
    this.isColorMapRangeLocked = false;
    this.colorMapRangeMin = 0;
    this.colorMapRangeMax = 0;
    this.currentFrame = 0;
    this.totalFrames = 0;
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
    this.totalFrames = dataset.numberOfFrames;
    const frame = await this.dataset?.loadFrame(this.currentFrame);
    if (!frame) {
      return;
    }
    this.setUniform("frame", frame);
    this.render();
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
    this.pickMaterial.uniforms[name].value = value;
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

  setHighlightedId(id: number): void {
    this.setUniform("highlightedId", id);
  }

  setFeature(name: string): void {
    if(!this.dataset?.hasFeature(name)) {
      return;
    }
    const featureData = this.dataset.getFeatureData(name)!;
    this.featureName = name;
    this.setUniform("featureData", featureData.tex);
    // Don't update the range values when locked
    // TODO: Decide if feature range should be unlocked when the feature changes.
    if (!this.isColorMapRangeLocked) {
      this.colorMapRangeMin = featureData.min;
      this.colorMapRangeMax = featureData.max;
    }
    this.setUniform("featureMin", this.colorMapRangeMin);
    this.setUniform("featureMax", this.colorMapRangeMax);
    this.render();  // re-render necessary because map range may have changed
  }

  setColorMapRangeLock(locked: boolean): void {
    this.isColorMapRangeLocked = locked;
    if (this.featureName) {  // trigger update for color map range
      this.setFeature(this.featureName);
    }
  }

  getColorMapRangeMin(): number {
    return this.colorMapRangeMin;
  }

  getColorMapRangeMax(): number {
    return this.colorMapRangeMax;
  }

  getTotalFrames(): number {
    return this.totalFrames;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Sets the current frame of the canvas. If the frame index changed, triggers a
   * load of frame data. (NOTE: this does not trigger a re-render!)
   * @param index Index of the new frame.
   * @param wrap Whether to wrap frame indices around if out of bounds.
   * @returns whether the frame was set correctly and in range.
   */
  async setFrame(index: number, wrap = true): Promise<boolean> {
    if (wrap) {
      index = (index + this.totalFrames) % this.totalFrames;
    } else {
      const outOfBounds = index > this.totalFrames - 1 || index < 0;
      if (outOfBounds) {
        console.log(`frame ${index} out of bounds`);
        return false;
      }
    }

    console.log("going to Frame " + index);

    if (this.currentFrame !== index) {
      // Trigger re-render + frame loading only if the frame is different
      this.currentFrame = index;
      const frame = await this.dataset?.loadFrame(index);
      if (!frame) {
        return false;
      }
      this.setUniform("frame", frame);
    }
    return true;
  }

  render(): void {
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
