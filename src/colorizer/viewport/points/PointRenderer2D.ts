import {
  Color,
  InstancedMesh,
  Matrix4,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import Dataset from "src/colorizer/Dataset";
import { hasPropertyChanged } from "src/colorizer/utils/data_utils";
import PointMaterial from "src/colorizer/viewport/points/PointMaterial";
import { PointRendererParams } from "src/colorizer/viewport/points/types";

const DEFAULT_INSTANCE_COUNT = 256;

/**
 * Renders centroid data to an image texture that can be passed into the
 * colorize shader for 2D rendering + colorization.
 */
class PointRenderer2D {
  private params: PointRendererParams | null = null;
  private timeToIds: Map<number, Uint32Array>;

  private scene: Scene;
  private pointsMesh: InstancedMesh;
  private renderer: WebGLRenderer;
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
    this.scene.add(this.pointsMesh);

    this.camera = new OrthographicCamera();
    this.renderTarget = new WebGLRenderTarget(1, 1);

    this.renderer = new WebGLRenderer({ antialias: false });
    this.renderer.setSize(1, 1);
    this.renderer.setClearColor(0x000000, 0);
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
      if (centroid) {
        const [x, y] = centroid;
        this.pointsMesh.setMatrixAt(
          i,
          new Matrix4().makeTranslation(x, y, 0).scale(new Vector3(pointRadius, pointRadius, 1))
        );
      }
      // Placeholder: calculate colors based on ID later
      this.pointsMesh.setColorAt(i, new Color("#ffffff"));
    }
  }

  public renderFrame(frame: number): Texture | undefined {
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
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();

    // TODO: Configure camera?
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.position.set(width / 2, height / 2, -1);
    this.camera.lookAt(width / 2, height / 2, 0);
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    // this.renderer.setRenderTarget(null);

    this.lastRenderedFrame = frame;
    return this.renderTarget.texture;
  }

  public dispose(): void {
    this.timeToIds.clear();
  }
}

export default PointRenderer2D;
