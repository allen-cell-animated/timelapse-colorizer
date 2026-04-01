import {
  Color,
  FloatType,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SphereGeometry,
  Texture,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import Dataset from "src/colorizer/Dataset";
import { hasPropertyChanged } from "src/colorizer/utils/data_utils";
import PointMaterial from "src/colorizer/viewport/points/PointMaterial";
import { PointRendererParams } from "src/colorizer/viewport/points/types";
import { getColorForId } from "src/colorizer/viewport/points/utils";

const DEFAULT_INSTANCE_COUNT = 128;

/**
 * Renders centroid data to an image texture that can be passed into the
 * colorize shader for 2D rendering + colorization.
 */
class PointRenderer2D {
  private params: PointRendererParams | null = null;
  private timeToIds: Map<number, Uint32Array>;

  private scene: Scene;
  private pointsMesh: InstancedMesh;
  private camera: OrthographicCamera;
  private renderTarget: WebGLRenderTarget;

  private maxInstanceCount = DEFAULT_INSTANCE_COUNT;

  private lastRenderedFrame: number | null = null;

  constructor() {
    this.timeToIds = new Map();
    this.scene = new Scene();
    const planeGeometry = new PlaneGeometry(1, 1);
    const pointMaterial = new PointMaterial();
    this.pointsMesh = new InstancedMesh(planeGeometry, pointMaterial, DEFAULT_INSTANCE_COUNT);
    this.pointsMesh.position.set(0, 0, 0);
    // this.scene.add(this.pointsMesh);
    const ballGeometry = new SphereGeometry(0.5, 8, 8);
    const ballMaterial = new MeshBasicMaterial({ color: "green" });
    const ballMesh = new Mesh(ballGeometry, ballMaterial);
    // this.scene.add(ballMesh);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // TODO: Three does NOT support rendering to integer render targets. Change
    // this to a float.
    this.renderTarget = new WebGLRenderTarget(2, 2, {
      format: RGBAFormat,
      type: FloatType,
      internalFormat: "RGBA32F",
      generateMipmaps: false,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });

    this.renderFrame = this.renderFrame.bind(this);
  }

  private computeTimeToIds(dataset: Dataset): Map<number, Uint32Array> {
    const timeToIds = new Map<number, number[]>();
    for (let i = 0; i < dataset.numObjects; i++) {
      const time = dataset.getTime(i);
      if (!timeToIds.has(time)) {
        timeToIds.set(time, []);
      }
      timeToIds.get(time)!.push(i);
    }
    // Map to Uint32Arrays for storage optimization
    const ret = new Map<number, Uint32Array>();
    for (const [time, ids] of timeToIds.entries()) {
      ret.set(time, new Uint32Array(ids));
    }
    return ret;
  }

  public setParams(params: PointRendererParams, prevParams: PointRendererParams | null): boolean {
    let needsRender = false;
    this.params = params;
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      if (params.dataset) {
        this.timeToIds = this.computeTimeToIds(params.dataset);
      } else {
        this.timeToIds.clear();
      }
      needsRender = true;
    }
    if (hasPropertyChanged(params, prevParams, ["pointRadiusPx", "dataset"])) {
      this.lastRenderedFrame = null;
      needsRender = true;
    }
    return needsRender;
  }

  private setupPointsMesh(dataset: Dataset, ids: Uint32Array): void {
    if (!this.params) {
      return;
    }
    // Resize instances as needed
    if (ids.length > this.maxInstanceCount) {
      this.maxInstanceCount = ids.length;
      this.scene.remove(this.pointsMesh);
      const planeGeometry = new PlaneGeometry(1, 1);
      const pointMaterial = new PointMaterial();
      this.pointsMesh = new InstancedMesh(planeGeometry, pointMaterial, this.maxInstanceCount);
      this.scene.add(this.pointsMesh);
    }

    // Update size and color
    const pointRadius = this.params.pointRadiusPx;
    this.pointsMesh.count = ids.length;
    for (let i = 0; i < ids.length; i++) {
      const objectId = ids[i];
      const centroid = dataset.getCentroid(objectId);
      const matrix = new Object3D();
      if (centroid) {
        const [x, y] = centroid;
        matrix.scale.copy(new Vector3(pointRadius, pointRadius, 1));
        matrix.position.set(x, y, 0);
        matrix.lookAt(0, 0, 1);
        matrix.updateMatrix();

        this.pointsMesh.setMatrixAt(i, matrix.matrix);
      }
      // Placeholder: calculate colors based on ID later
      this.pointsMesh.setColorAt(i, getColorForId(objectId));
    }
    console.log("Updated points mesh with " + ids.length + " points");
  }

  public renderFrame(renderer: WebGLRenderer, frame: number): Texture | undefined {
    // Return cached texture if already rendered
    if (this.lastRenderedFrame === frame) {
      return this.renderTarget.texture;
    }
    const dataset = this.params?.dataset;
    if (!this.params || !dataset) {
      return undefined;
    }
    const width = dataset.frameResolution.x;
    const height = dataset.frameResolution.y;
    const ids = this.timeToIds.get(frame);
    if (ids) {
      this.setupPointsMesh(dataset, ids);
    } else {
      this.pointsMesh.count = 0;
    }
    this.renderTarget.setSize(width, height);
    // renderer.setClearColor("#ff0000", 1);
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();

    // TODO: Configure camera?
    // this.camera.left = -width / 2;
    // this.camera.right = width / 2;
    // this.camera.top = height / 2;
    // this.camera.bottom = -height / 2;
    // this.camera.position.set(width / 2, height / 2, 1);
    // this.camera.lookAt(width / 2, height / 2, 0);
    // this.camera.near = 0.1;
    // this.camera.far = 1000;
    // this.camera.updateProjectionMatrix();
    // this.scene.background = new Color("#00ffff");

    renderer.render(this.scene, this.camera);

    renderer.autoClear = true;
    renderer.setRenderTarget(null);

    this.lastRenderedFrame = frame;
    console.log("render target", this.renderTarget.texture);
    return this.renderTarget.texture;
  }

  public dispose(): void {
    this.timeToIds.clear();
  }
}

export default PointRenderer2D;
