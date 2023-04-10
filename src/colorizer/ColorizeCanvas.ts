import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer } from "three";

import vertexShader from "./shader/colorize.vert";
import fragmentShader from "./shader/colorize.frag";

export default class ColorizeCanvas {
  private scene: Scene;
  private camera: OrthographicCamera;
  private material: ShaderMaterial;
  private geometry: PlaneGeometry;
  private mesh: Mesh;
  private renderer: WebGLRenderer;

  constructor() {
    this.scene = new Scene();
    this.geometry = new PlaneGeometry(2, 2);
    this.material = new ShaderMaterial({ vertexShader, fragmentShader });

    this.material.depthWrite = false;
    this.material.depthTest = false;

    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new WebGLRenderer();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
