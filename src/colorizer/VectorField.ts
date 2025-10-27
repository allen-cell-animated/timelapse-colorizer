import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Line,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Vector2,
} from "three";

import { bucketVectorDataByTime } from "src/colorizer/utils/data_utils";

import { OUTLINE_COLOR_DEFAULT } from "./constants";
import type Dataset from "./Dataset";

const VERTICES_PER_VECTOR_LINE = 6;
const VERTEX_LENGTH = 3;
const ANGLE_TO_RADIANS = Math.PI / 180;

const arrowStyle = {
  headAngleRads: 30 * ANGLE_TO_RADIANS,
  maxHeadLengthPx: 6,
};

type ArrayVector3 = [number, number, number];

export type VectorFieldConfig = {
  visible: boolean;
  scaleFactor: number;
  color: Color;
};

/**
 * Renders vector arrows as a Three JS object.
 */
export default class VectorField {
  /**
   * The Three JS line object that will be rendered in the scene.
   *
   * Vertices of the vector lines for ALL objects across ALL timepoints are pre-calculated and
   * stored in the line's geometry buffer, grouped by frame number.
   *
   * By changing the slice of the geometry buffer we are rendering with (see `timeToVertexIndexRange`),
   * we can render only the vectors for a specific frame. This is a big optimization because we don't
   * need to re-calculate the vertices every frame or check what vectors are visible
   * (amortized O(1) vs. O(N)).
   */
  private line: Line<BufferGeometry, Material>;

  ///// Stored parameters /////
  private dataset: Dataset | null;
  private currentFrame: number;
  private scaleFactor: number;
  private visible: boolean;
  /** Resolution of the canvas in onscreen pixels. */
  private canvasResolution: Vector2;
  /**
   * Scales relative frame coordinates ([0, 1] range) to
   * relative canvas coordinates ([0, 1] range) based on the current
   * zoom level. (Doesn't account for panning.)
   */
  private frameToCanvasCoordinates: Vector2;
  /**
   * Vector data for each object in the dataset, as an array.
   * For each object ID `i`, the vector components are `(vectorData[2*i], vectorData[2*i+1])`.
   */
  private vectorData: Float32Array | null;

  ///// Calculated data /////
  /** Maps from a frame number to the range of vertices that should be drawn for that frame. */
  private timeToVertexIndexRange: Map<number, [number, number]>;

  constructor() {
    this.dataset = null;
    this.scaleFactor = 1;
    this.visible = false;
    this.currentFrame = 0;
    this.canvasResolution = new Vector2();
    this.frameToCanvasCoordinates = new Vector2();
    this.vectorData = new Float32Array();

    const lineGeometry = new BufferGeometry();
    const lineMaterial = new LineBasicMaterial({
      color: new Color(OUTLINE_COLOR_DEFAULT),
      // Note: setting line width to anything other than 1.0 is unreliable.
      // See https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/lineWidth
      linewidth: 1,
    });

    this.line = new LineSegments(lineGeometry, lineMaterial);
    this.line.frustumCulled = false;
    this.timeToVertexIndexRange = new Map();
  }

  public get sceneObject(): Line<BufferGeometry, Material> {
    return this.line;
  }

  public setFrame(frame: number): void {
    this.currentFrame = frame;

    // Update vertex geometry range to render.
    const range = this.timeToVertexIndexRange.get(frame);
    if (range && this.visible) {
      this.line.geometry.setDrawRange(range[0], range[1] - range[0]);
    } else {
      this.line.geometry.setDrawRange(0, 0);
    }
  }

  /**
   * Scales from frame pixel coordinates to relative frame coordinates.
   *
   * Frame pixel coordinates are in a range from `[0, frameResolution.x]` and
   * `[0, frameResolution.y]`, where `(0, 0)` is the top left corner.
   * Relative frame coordinates are in a range from `[-0.5, 0.5]`, where
   * `(0, 0)` is the center of the frame and `(-0.5, 0.5)` is the top left corner.
   */
  private framePixelsToRelativeFrameCoords(vector: ArrayVector3): ArrayVector3 {
    if (!this.dataset) {
      return [0, 0, 0];
    }
    return [
      (vector[0] / this.dataset.frameResolution.x) * 2.0 - 1.0,
      -(vector[1] / this.dataset.frameResolution.y) * 2.0 + 1.0,
      vector[2],
    ];
  }

  /**
   * Scales from relative frame coordinates to screen space pixel coordinates.
   * Relative frame coordinates are in a range from `[-0.5, 0.5]`, and
   * screen space pixel coordinates match the onscreen canvas pixels.
   */
  private relativeFrameCoordsToScreenSpacePx(vector: ArrayVector3): ArrayVector3 {
    return [
      vector[0] * this.frameToCanvasCoordinates.x * this.canvasResolution.x,
      vector[1] * this.frameToCanvasCoordinates.y * this.canvasResolution.y,
      vector[2],
    ];
  }

  private scaleArrowHead(
    vector: ArrayVector3,
    length: number,
    frameToCanvasCoordinates: Vector2,
    canvasResolution: Vector2
  ): ArrayVector3 {
    return [
      (vector[0] * length) / frameToCanvasCoordinates.x / canvasResolution.x,
      (vector[1] * length) / frameToCanvasCoordinates.y / canvasResolution.y,
      vector[2],
    ];
  }

  private addArrayVectors(v1: ArrayVector3, v2: ArrayVector3): ArrayVector3 {
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
  }

  private getArrowHeadVertices(normVectorStart: ArrayVector3, normVectorEnd: ArrayVector3): Float32Array {
    //    o <- normVectorEnd
    //   /|\
    //  / | \  <- arrow head maintains onscreen pixel length with zoom
    //    |
    //    |
    //    o <- normVectorStart

    // Draw the arrow heads. These are two line segments for each, so there's a total of four additional vertices we need to add.
    const vertices = new Float32Array((VERTICES_PER_VECTOR_LINE - 2) * VERTEX_LENGTH);

    // TODO: Handle scaling and arrow head length in a vertex shader.
    // There's extra work being done here to keep the arrow head length constant with zoom, but it also
    // means that currently this is recalculated EVERY time the zoom changes.
    const screenSpaceStartPx = this.relativeFrameCoordsToScreenSpacePx(normVectorStart);
    const screenSpaceEndPx = this.relativeFrameCoordsToScreenSpacePx(normVectorEnd);
    const screenSpaceDeltaPx = [
      screenSpaceEndPx[0] - screenSpaceStartPx[0],
      screenSpaceEndPx[1] - screenSpaceStartPx[1],
    ];
    const vectorLengthPx = Math.sqrt(
      screenSpaceDeltaPx[0] * screenSpaceDeltaPx[0] + screenSpaceDeltaPx[1] * screenSpaceDeltaPx[1]
    );

    const vectorAngle = Math.atan2(screenSpaceDeltaPx[1], screenSpaceDeltaPx[0]) + Math.PI;
    const lArrowAngle = vectorAngle + arrowStyle.headAngleRads;
    const rArrowAngle = vectorAngle - arrowStyle.headAngleRads;
    let lArrowSegment: ArrayVector3 = [Math.cos(lArrowAngle), Math.sin(lArrowAngle), 0];
    let rArrowSegment: ArrayVector3 = [Math.cos(rArrowAngle), Math.sin(rArrowAngle), 0];

    const lengthPx = Math.min(arrowStyle.maxHeadLengthPx * 2, vectorLengthPx);

    // Keep arrow head length constant relative to onscreen pixels
    // Arrow heads are in screen space pixel coordinates, so we divide by canvas resolution to get relative canvas coordinates,
    // and then divide again by `frameToCanvasCoordinates` to get relative frame coordinates.
    lArrowSegment = this.scaleArrowHead(lArrowSegment, lengthPx, this.frameToCanvasCoordinates, this.canvasResolution);
    rArrowSegment = this.scaleArrowHead(rArrowSegment, lengthPx, this.frameToCanvasCoordinates, this.canvasResolution);

    vertices.set(normVectorEnd, 0 * VERTEX_LENGTH);
    vertices.set(this.addArrayVectors(lArrowSegment, normVectorEnd), 1 * VERTEX_LENGTH);
    vertices.set(normVectorEnd, 2 * VERTEX_LENGTH);
    vertices.set(this.addArrayVectors(rArrowSegment, normVectorEnd), 3 * VERTEX_LENGTH);

    return vertices;
  }

  private getArrowVertices(centroid: [number, number, number], delta: [number, number, number]): Float32Array {
    // Draw the main vector line segment from centroid to centroid + delta.
    // TODO: Perform scaling as a step in a vertex shader.
    const vertices = new Float32Array(VERTICES_PER_VECTOR_LINE * VERTEX_LENGTH);

    const vectorStart: ArrayVector3 = [centroid[0], centroid[1], 0];
    const vectorEnd: ArrayVector3 = [
      centroid[0] + delta[0] * this.scaleFactor,
      centroid[1] + delta[1] * this.scaleFactor,
      // NOTE: We discard 3D component of vector here because this is in 2D, but
      // some future 3D vector visualization may want to use this.
      0,
    ];
    const normVectorEnd = this.framePixelsToRelativeFrameCoords(vectorEnd);
    const normVectorStart = this.framePixelsToRelativeFrameCoords(vectorStart);
    vertices.set(normVectorStart, 0 * VERTEX_LENGTH);
    vertices.set(normVectorEnd, 1 * VERTEX_LENGTH);

    // Draw arrow head
    vertices.set(this.getArrowHeadVertices(normVectorStart, normVectorEnd), 2 * VERTEX_LENGTH);

    return vertices;
  }

  /**
   * Calculates the vertices for the vector lines for ALL objects in the dataset,
   * across ALL timepoints. Vertices are stored in the line's geometry buffer,
   * grouped by frame number. Each pair of vertices represents a line segment.
   *
   * Currently, each vector line takes up 6 vertices, two for the main line segment
   * and four for the arrow heads' two lines.
   * For a vertex at index `i`, the vertex's XY components are stored at
   * at `(2i, 2i + 1)`.
   *
   * This method updates vertices and the `timeToVertexIndexRange` map, which maps from
   * a frame number to the range of vertices that should be drawn for that frame.
   */
  private updateLineVertices(): void {
    if (!this.dataset || !this.vectorData || !this.visible) {
      this.line.geometry.setDrawRange(0, 0);
      return;
    }

    // Sort object IDs into buckets by time. Drop any IDs whose vectors are invalid (NaN).
    const { timeToVectorData, totalValidIds } = bucketVectorDataByTime(this.dataset, this.vectorData);

    const numVertices = totalValidIds * VERTICES_PER_VECTOR_LINE;
    const vertices = new Float32Array(numVertices * 3);

    // For each ID, fill in the vertex information (centroid + delta).
    // Save the starting and ending index for each time.
    this.timeToVertexIndexRange.clear();
    let nextEmptyIndex = 0;
    for (const [time, vectorData] of timeToVectorData.entries()) {
      const { ids, centroids, deltas } = vectorData;
      this.timeToVertexIndexRange.set(time, [nextEmptyIndex, nextEmptyIndex + ids.length * VERTICES_PER_VECTOR_LINE]);
      for (let i = 0; i < ids.length; i++) {
        const centroid = centroids.subarray(3 * i, 3 * i + 3);
        const delta = deltas.subarray(3 * i, 3 * i + 3);

        const arrowVertices = this.getArrowVertices(
          Array.from(centroid) as [number, number, number],
          Array.from(delta) as [number, number, number]
        );
        vertices.set(arrowVertices, nextEmptyIndex * VERTEX_LENGTH);

        nextEmptyIndex += VERTICES_PER_VECTOR_LINE;
      }
    }

    // Update line buffer geometry
    const lineGeometry = this.line.geometry;
    lineGeometry.setAttribute("position", new BufferAttribute(vertices, 3));
    lineGeometry.getAttribute("position").needsUpdate = true;

    // Update draw range to render the current frame.
    this.setFrame(this.currentFrame);
  }

  public setDataset(dataset: Dataset): void {
    if (this.dataset !== dataset) {
      this.dataset = dataset;
      this.updateLineVertices();
    }
  }

  public setScale(frameToCanvasCoordinates: Vector2, canvasResolution: Vector2): void {
    if (
      this.canvasResolution.equals(canvasResolution) &&
      this.frameToCanvasCoordinates.equals(frameToCanvasCoordinates)
    ) {
      return;
    }

    this.canvasResolution.copy(canvasResolution);
    this.frameToCanvasCoordinates.copy(frameToCanvasCoordinates);
    this.line.scale.set(frameToCanvasCoordinates.x, frameToCanvasCoordinates.y, 1);
    this.updateLineVertices();
  }

  public setPosition(panOffset: Vector2, frameToCanvasCoordinates: Vector2): void {
    this.line.position.set(
      2 * panOffset.x * frameToCanvasCoordinates.x,
      2 * panOffset.y * frameToCanvasCoordinates.y,
      0
    );
  }

  public setConfig(config: VectorFieldConfig): void {
    // TODO: will not need update if scaling is controlled by vertex shader
    const needsUpdate = this.scaleFactor !== config.scaleFactor || this.visible !== config.visible;

    this.visible = config.visible;
    this.scaleFactor = config.scaleFactor;
    (this.line.material as LineBasicMaterial).color = config.color;

    if (needsUpdate) {
      this.updateLineVertices();
    }
  }

  public setVectorData(vectorData: Float32Array | null): void {
    if (this.vectorData !== vectorData) {
      this.vectorData = vectorData;
      this.updateLineVertices();
    }
  }
}
