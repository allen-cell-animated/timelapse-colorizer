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
import { packBooleanDataTexture, packFloatDataTexture } from "./utils/texture_utils";
import vertexShader from "./shaders/colorize.vert";
import fragmentShader from "./shaders/colorize_RGBA8U.frag";
import pickFragmentShader from "./shaders/cellId_RGBA8U.frag";

const BACKGROUND_COLOR_DEFAULT = 0xf7f7f7;
const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;

type ColorizeUniformTypes = {
  aspect: number;
  frame: Texture;
  featureData: DataTexture;
  outlierData: DataTexture;
  featureMin: number;
  featureMax: number;
  colorRamp: DataTexture;
  backgroundColor: Color;
  outlierColor: Color;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  const emptyFeature = packFloatDataTexture([0]);
  const emptyOutliers = packBooleanDataTexture([false]);
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

  setDataset(dataset: Dataset): void {
    if (this.dataset !== null) {
      this.dataset.dispose();
    }
    this.dataset = dataset;
    if (this.dataset.outliers) {
      this.setUniform("outlierData", this.dataset.outliers);
    } else {
      this.setUniform("outlierData", packBooleanDataTexture([false]));
    }
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

  setFeature(name: string): void {
    if (!this.dataset?.features.hasOwnProperty(name)) {
      return;
    }

    const { tex, min, max } = this.dataset.features[name];

    this.setUniform("featureData", tex);
    this.setUniform("featureMin", min);
    this.setUniform("featureMax", max / 1.5);
  }

  async setFrame(index: number): Promise<void> {
    const frame = await this.dataset?.loadFrame(index);
    if (!frame) {
      return;
    }
    this.setUniform("frame", frame);
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
