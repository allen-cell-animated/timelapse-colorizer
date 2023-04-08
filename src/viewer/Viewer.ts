import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial } from "three";

import vertexShader from "./shader/colorize.vert";
import fragmentShader from "./shader/colorize.frag";

export default class Viewer {
  private scene: Scene;
  private camera: OrthographicCamera;
  private material: ShaderMaterial;
  private geometry: PlaneGeometry;
  private mesh: Mesh;

  constructor() {
    this.scene = new Scene();
    this.geometry = new PlaneGeometry(2, 2);
    this.material = new ShaderMaterial({ vertexShader, fragmentShader });

    this.material.depthWrite = false;
    this.material.depthTest = false;

    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
}
