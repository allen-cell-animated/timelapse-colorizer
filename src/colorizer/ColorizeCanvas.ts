import {
  GLSL3,
  Uniform,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  DataTexture,
} from "three";

import Dataset from "./Dataset";

import vertexShader from "./shader/colorize.vert";
import fragmentShader from "./shader/colorize.frag";

type ColorizeUniformTypes = {
  frame: Texture;
  featureData: DataTexture;
  featureMin: number;
  featureMax: number;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => ({
  frame: new Uniform(new Texture()),
  featureData: new Uniform(new DataTexture()),
  featureMin: new Uniform(0),
  featureMax: new Uniform(0),
});

export default class ColorizeCanvas {
  private scene: Scene;
  private camera: OrthographicCamera;
  private material: ShaderMaterial;
  private geometry: PlaneGeometry;
  private mesh: Mesh;
  private renderer: WebGLRenderer;

  private dataset: Dataset | null;

  constructor() {
    this.scene = new Scene();
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
    this.scene.add(this.mesh);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new WebGLRenderer();

    this.dataset = null;
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
  }

  setFeature(name: string): void {
    if (!this.dataset?.features.hasOwnProperty(name)) {
      return;
    }

    const { data, min, max } = this.dataset.features[name];

    this.setUniform("featureData", data);
    this.setUniform("featureMin", min);
    this.setUniform("featureMax", max);
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
