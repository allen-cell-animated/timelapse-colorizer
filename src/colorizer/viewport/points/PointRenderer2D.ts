import {
  BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NearestFilter,
  OrthographicCamera,
  Points,
  RGBAIntegerFormat,
  Scene,
  type Texture,
  UnsignedByteType,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import type Dataset from "src/colorizer/Dataset";
import { hasPropertyChanged } from "src/colorizer/utils/data_utils";
import { makeEmptyRgbaUint8Texture } from "src/colorizer/utils/texture_utils";
import PointMaterial2D, { PointMaterialInstanceAttributes } from "src/colorizer/viewport/points/PointMaterial2D";
import type { PointRendererParams } from "src/colorizer/viewport/points/types";

const DEFAULT_INSTANCE_COUNT = 128;
const SCALE_WITH_ZOOM = 0.25;

function getPointBufferGeometry(): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  const vertices = new Float32Array([0, 0, 0]);
  geometry.setAttribute("position", new BufferAttribute(vertices, 3));
  return geometry;
}

/**
 * Renders the centroid points of objects to an image texture, encoding their
 * IDs in the RGB channels. The resulting texture can be passed into the
 * colorize shader for 2D rendering + colorization.
 */
class PointRenderer2D {
  private params: PointRendererParams | null = null;

  private scene: Scene;

  private points: Points<InstancedBufferGeometry, PointMaterial2D>;
  private instancedGeometry: InstancedBufferGeometry;
  private positionAndScaleAttribute: InstancedBufferAttribute;
  private idAttribute: InstancedBufferAttribute;

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
  private frameToCanvasScale: Vector2;
  /**
   * The offset of the frame in the canvas, in normalized frame coordinates. [0, 0] means the
   * frame will be centered, while [-0.5, -0.5] means the top right corner of the frame will be
   * centered in the canvas view.
   */
  private panOffset: Vector2;
  private zoomMultiplier: number = 1;

  private maxInstanceCount = DEFAULT_INSTANCE_COUNT;

  private lastRenderedFrame: number | null = null;
  private lastMeshUpdateFrame: number | null = null;
  private emptyTexture: Texture;

  constructor() {
    this.scene = new Scene();
    const pointMaterial = new PointMaterial2D();

    this.instancedGeometry = getPointBufferGeometry();
    this.instancedGeometry.instanceCount = 0;

    // Set up per-instance attributes.
    this.positionAndScaleAttribute = new InstancedBufferAttribute(
      new Float32Array(DEFAULT_INSTANCE_COUNT * 4),
      4,
      false
    );
    this.idAttribute = new InstancedBufferAttribute(new Uint32Array(DEFAULT_INSTANCE_COUNT), 1, false);
    this.instancedGeometry.setAttribute(PointMaterialInstanceAttributes.POSITION, this.positionAndScaleAttribute);
    this.instancedGeometry.setAttribute(PointMaterialInstanceAttributes.LABEL_ID, this.idAttribute);

    this.points = new Points(this.instancedGeometry, pointMaterial);

    this.scene.add(this.points);

    this.panOffset = new Vector2(0, 0);
    this.frameToCanvasScale = new Vector2(1, 1);
    this.canvasResolution = new Vector2(1, 1);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderTarget = new WebGLRenderTarget(2, 2, {
      format: RGBAIntegerFormat,
      type: UnsignedByteType,
      internalFormat: "RGBA8UI",
      generateMipmaps: false,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });

    this.emptyTexture = makeEmptyRgbaUint8Texture();

    this.requestFrameRender = this.requestFrameRender.bind(this);
  }

  public setParams(params: PointRendererParams, prevParams: PointRendererParams | null): boolean {
    let needsRender = false;
    this.params = params;
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      this.lastMeshUpdateFrame = null;
      needsRender = true;
    }
    if (hasPropertyChanged(params, prevParams, ["centroidRadiusPx", "dataset"])) {
      this.lastRenderedFrame = null;
      needsRender = true;
    }
    return needsRender;
  }

  private increaseMaxInstanceCount(newCount: number): void {
    this.maxInstanceCount = newCount;

    this.instancedGeometry.dispose();
    const pointGeometry = getPointBufferGeometry() as InstancedBufferGeometry;
    this.instancedGeometry = new InstancedBufferGeometry().copy(pointGeometry);
    this.points.geometry = this.instancedGeometry;

    const newPos = new Float32Array(this.maxInstanceCount * 4);
    const newIds = new Uint32Array(this.maxInstanceCount);
    this.positionAndScaleAttribute = new InstancedBufferAttribute(newPos, 4, false);
    this.idAttribute = new InstancedBufferAttribute(newIds, 1, false);

    this.instancedGeometry.setAttribute(PointMaterialInstanceAttributes.POSITION, this.positionAndScaleAttribute);
    this.instancedGeometry.setAttribute(PointMaterialInstanceAttributes.LABEL_ID, this.idAttribute);
  }

  private setupPointsMesh(dataset: Dataset, ids: Uint32Array): void {
    if (!this.params) {
      return;
    }
    // Resize instances as needed
    if (ids.length > this.maxInstanceCount) {
      this.increaseMaxInstanceCount(ids.length);
    }

    // Update size and color
    // this.pointsMesh.count = ids.length;
    this.instancedGeometry.instanceCount = ids.length;
    for (let i = 0; i < ids.length; i++) {
      const objectId = ids[i];
      const segId = dataset.getSegmentationId(objectId);
      const centroid = dataset.getCentroid(objectId);
      if (!centroid) {
        this.positionAndScaleAttribute.setXYZW(i, 0, 0, 0, 0);
        this.idAttribute.setX(i, 0);
        continue;
      }
      const x = centroid[0];
      const y = dataset.frameResolution.y - centroid[1];
      const z = centroid[2];
      // TODO: Set scale from data in the future (per-point scaling)
      const scale = 1;
      this.positionAndScaleAttribute.setXYZW(i, x, y, z, scale);
      this.idAttribute.setX(i, segId);
    }
    this.positionAndScaleAttribute.needsUpdate = true;
    this.idAttribute.needsUpdate = true;
  }

  public setPositionAndScale(
    panOffset: Vector2,
    frameToCanvasCoordinates: Vector2,
    canvasResolution: Vector2,
    zoomMultiplier: number
  ): void {
    this.panOffset.copy(panOffset);
    this.frameToCanvasScale.copy(frameToCanvasCoordinates);
    this.canvasResolution.copy(canvasResolution);
    this.zoomMultiplier = zoomMultiplier;
    this.lastRenderedFrame = null;
  }

  /** Requests a rerender of the points texture for the given frame. */
  public requestFrameRender(renderer: WebGLRenderer, frame: number): Texture | undefined {
    // Return empty texture if centroids are not visible
    if (this.params?.showCentroids === false) {
      this.lastRenderedFrame = null;
      return this.emptyTexture;
    }
    // Return cached texture if already rendered;
    if (this.lastRenderedFrame === frame) {
      return this.renderTarget.texture;
    }
    const dataset = this.params?.dataset;
    if (!this.params || !dataset) {
      return undefined;
    }
    // Recalculate points if needed
    if (this.lastMeshUpdateFrame !== frame) {
      this.lastMeshUpdateFrame = frame;
      const globalIds = dataset.frameToGlobalIdLookup?.get(frame)?.globalIds;
      if (globalIds) {
        this.setupPointsMesh(dataset, globalIds);
      } else {
        this.instancedGeometry.instanceCount = 0;
      }
    }

    // Store current render config and restore after rendering.
    const prevRenderTarget = renderer.getRenderTarget();
    const prevClearColor = new Color();
    renderer.getClearColor(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();

    const width = dataset.frameResolution.x;
    const height = dataset.frameResolution.y;
    this.renderTarget.setSize(
      Math.round(this.canvasResolution.x * renderer.getPixelRatio()),
      Math.round(this.canvasResolution.y * renderer.getPixelRatio())
    );
    renderer.setClearColor("#000000", 0);
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();

    this.camera.left = -width / 2 / this.frameToCanvasScale.x;
    this.camera.right = width / 2 / this.frameToCanvasScale.x;
    this.camera.top = height / 2 / this.frameToCanvasScale.y;
    this.camera.bottom = -height / 2 / this.frameToCanvasScale.y;
    this.camera.position.set((0.5 - this.panOffset.x) * width, (0.5 - this.panOffset.y) * height, 1);
    this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
    this.camera.near = 0;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();

    const zoomScaleMultiplier = this.zoomMultiplier * SCALE_WITH_ZOOM + (1 - SCALE_WITH_ZOOM);
    this.points.material.baseScale = 2 * this.params.centroidRadiusPx * zoomScaleMultiplier * renderer.getPixelRatio();
    this.points.frustumCulled = false;

    renderer.render(this.scene, this.camera);

    renderer.setRenderTarget(prevRenderTarget);
    renderer.setClearColor(prevClearColor, prevClearAlpha);

    this.lastRenderedFrame = frame;
    return this.renderTarget.texture;
  }

  public dispose(): void {
    this.instancedGeometry.dispose();
    this.points.material.dispose();
    this.renderTarget.dispose();
  }
}

export default PointRenderer2D;
