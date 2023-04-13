import {
  GLSL3,
  Uniform,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
  DataTexture,
  RedFormat,
  IntType,
  FloatType,
  RedIntegerFormat,
  Color,
  Texture,
} from "three";

import Dataset from "./Dataset";

import vertexShader from "./shader/colorize.vert";
import fragmentShader from "./shader/colorize.frag";

const BACKGROUND_COLOR_DEFAULT = 0xffffff;
const OUTLIER_COLOR_DEFAULT = 0x00ff00;

type ColorizeUniformTypes = {
  frame: Texture;
  featureData: DataTexture;
  featureMin: number;
  featureMax: number;
  backgroundColor: Color;
  outlierColor: Color;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyFrame = new DataTexture(new Int32Array([0, 1, 1, 0]), 2, 2, RedIntegerFormat, IntType);
  emptyFrame.internalFormat = "R32I";
  emptyFrame.needsUpdate = true;
  const emptyFeature = new DataTexture(new Float32Array([0, 1]), 2, 1, RedFormat, FloatType);
  emptyFeature.internalFormat = "R32F";
  emptyFeature.needsUpdate = true;
  return {
    frame: new Uniform(emptyFrame),
    featureData: new Uniform(emptyFeature),
    featureMin: new Uniform(0),
    featureMax: new Uniform(1),
    backgroundColor: new Uniform(new Color(BACKGROUND_COLOR_DEFAULT)),
    outlierColor: new Uniform(new Color(OUTLIER_COLOR_DEFAULT)),
  };
};

export default class ColorizeCanvas {
  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private mesh: Mesh;

  private scene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;

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
    this.mesh = new Mesh(this.geometry, this.material);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new Scene();
    this.scene.add(this.mesh);

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
    this.renderer.setSize(width, height);
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
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

    const { data, min, max } = this.dataset.features[name];

    this.setUniform("featureData", data);
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
}
