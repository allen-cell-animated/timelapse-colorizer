import {
  BufferGeometry,
  FloatType,
  InstancedMesh,
  InstancedMeshEventMap,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  Texture,
  Vector2,
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
  private pointsMesh: InstancedMesh<BufferGeometry, PointMaterial, InstancedMeshEventMap>;
  private camera: OrthographicCamera;
  private renderTarget: WebGLRenderTarget;

  /** Resolution of the canvas in onscreen pixels. */
  private canvasResolution: Vector2;
  /**
   * Transforms from [0,1] space of the canvas to the [0,1] space of the frame,
   * accounting for zoom.
   *
   * e.g. If frame has the same aspect ratio as the canvas and zoom is set to
   * 2x, then, assuming that the [0, 0] position of the frame and the canvas are
   * in the same position, the position [1, 1] on the canvas should map to [0.5,
   * 0.5] on the frame.
   */
  private frameToCanvasCoordinates: Vector2;
  /**
   * The offset of the frame in the canvas, in normalized frame coordinates. [0, 0] means the
   * frame will be centered, while [-0.5, -0.5] means the top right corner of the frame will be
   * centered in the canvas view.
   */
  private panOffset: Vector2;

  private maxInstanceCount = DEFAULT_INSTANCE_COUNT;

  private lastRenderedFrame: number | null = null;

  constructor() {
    this.timeToIds = new Map();
    this.scene = new Scene();
    const planeGeometry = new PlaneGeometry(1, 1);
    const pointMaterial = new PointMaterial();
    this.pointsMesh = new InstancedMesh(planeGeometry, pointMaterial, DEFAULT_INSTANCE_COUNT);
    this.pointsMesh.position.set(0, 0, 0);
    this.scene.add(this.pointsMesh);

    this.panOffset = new Vector2(0, 0);
    this.frameToCanvasCoordinates = new Vector2(1, 1);
    this.canvasResolution = new Vector2(1, 1);

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
    this.pointsMesh.count = ids.length;
    for (let i = 0; i < ids.length; i++) {
      const objectId = ids[i];
      const centroid = dataset.getCentroid(objectId);
      const matrix = new Object3D();
      if (centroid) {
        const x = centroid[0];
        const y = dataset.frameResolution.y - centroid[1];
        matrix.scale.set(1, 1, 1);
        matrix.position.set(x, y, 0);
        matrix.lookAt(x, y, 1);
        matrix.updateMatrix();

        this.pointsMesh.setMatrixAt(i, matrix.matrix);
      }
      // Placeholder: calculate colors based on ID later
      this.pointsMesh.setColorAt(i, getColorForId(objectId));
    }
    this.pointsMesh.instanceMatrix.needsUpdate = true;
    this.pointsMesh.instanceColor!.needsUpdate = true;
    this.pointsMesh.frustumCulled = false;
  }

  public setPositionAndScale(panOffset: Vector2, frameToCanvasCoordinates: Vector2, canvasResolution: Vector2): void {
    this.panOffset.copy(panOffset);
    this.frameToCanvasCoordinates.copy(frameToCanvasCoordinates);
    this.canvasResolution.copy(canvasResolution);
    this.lastRenderedFrame = null;
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
    this.renderTarget.setSize(this.canvasResolution.x, this.canvasResolution.y);
    renderer.setClearColor("#000000", 0);
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();

    this.camera.left = -width / 2 / this.frameToCanvasCoordinates.x;
    this.camera.right = width / 2 / this.frameToCanvasCoordinates.x;
    this.camera.top = height / 2 / this.frameToCanvasCoordinates.y;
    this.camera.bottom = -height / 2 / this.frameToCanvasCoordinates.y;
    this.camera.position.set((0.5 - this.panOffset.x) * width, (0.5 - this.panOffset.y) * height, 1);
    this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
    this.camera.near = 0;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();

    // Scale point radius so the points are the same size in canvas space
    // regardless of zoom level or frame resolution.
    const canvasToFramePixels = dataset.frameResolution
      .clone()
      .divide(this.frameToCanvasCoordinates)
      .divide(this.canvasResolution);
    // TODO: Scale a little bit with zoom
    this.pointsMesh.material.pointRadiusPx =
      this.params.pointRadiusPx * Math.max(canvasToFramePixels.x, canvasToFramePixels.y);

    renderer.render(this.scene, this.camera);

    renderer.autoClear = true;
    renderer.setRenderTarget(null);

    this.lastRenderedFrame = frame;
    return this.renderTarget.texture;
  }

  public dispose(): void {
    this.timeToIds.clear();
  }
}

export default PointRenderer2D;
