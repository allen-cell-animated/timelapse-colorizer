import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, LineSegments, Material, Vector2 } from "three";

import { getDefaultVectorConfig, VectorConfig, VectorViewMode } from "./types";

import Dataset from "./Dataset";

// TODO: eventually increase this to 6 when adding arrow heads.
const VERTICES_PER_VECTOR_LINE = 6;
const ANGLE_TO_RADIANS = Math.PI / 180;

const arrowStyle = {
  headAngleRads: 30 * ANGLE_TO_RADIANS,
  maxHeadLengthPx: 10,
};

type ArrayVector = [number, number, number];

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
   * we can render only the vectors for a specific frame (O(1)). This is a big optimization because we don't
   * need to re-calculate the vertices every frame or check what vectors are visible (O(N)).
   */
  private line: Line<BufferGeometry, Material>;

  // Stored parameters
  private dataset: Dataset | null;
  private config: VectorConfig;
  private currentFrame: number;
  /** Resolution of the canvas in onscreen pixels. */
  private canvasResolution: Vector2;
  /**
   * Scales relative frame coordinates ([0, 1] range) to
   * relative canvas coordinates ([0, 1] range) based on the current
   * zoom level.
   */
  private frameToCanvasCoordinates: Vector2;
  /**
   * Vector data for each object in the dataset, as an array.
   * For each object ID `i`, the vector components are `(motionDeltas[2*i], motionDeltas[2*i+1])`.
   */
  private idToVectorData: Float32Array;

  // Calculated data
  /** Maps from a frame number to the range of vertices that should be drawn for that frame. */
  private timeToVertexIndexRange: Map<number, [number, number]>;

  constructor() {
    this.dataset = null;
    this.config = getDefaultVectorConfig();
    this.currentFrame = 0;
    this.canvasResolution = new Vector2();
    this.frameToCanvasCoordinates = new Vector2();
    this.idToVectorData = new Float32Array();

    const lineGeometry = new BufferGeometry();
    const lineMaterial = new LineBasicMaterial({
      color: this.config.color,
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
    if (range && this.config.mode !== VectorViewMode.HIDE) {
      this.line.geometry.setDrawRange(range[0], range[1] - range[0]);
    } else {
      this.line.geometry.setDrawRange(0, 0);
    }
  }

  private framePixelsToRelativeFrameCoords(vector: ArrayVector): ArrayVector {
    if (!this.dataset) {
      return [0, 0, 0];
    }
    return [
      (vector[0] / this.dataset.frameResolution.x) * 2.0 - 1.0,
      -(vector[1] / this.dataset.frameResolution.y) * 2.0 + 1.0,
      vector[2],
    ];
  }

  private relativeFrameCoordsToScreenSpacePx(vector: ArrayVector): ArrayVector {
    return [
      vector[0] * this.frameToCanvasCoordinates.x * this.canvasResolution.x,
      vector[1] * this.frameToCanvasCoordinates.y * this.canvasResolution.y,
      vector[2],
    ];
  }

  /**
   * Calculates the vertices for the vector lines for ALL objects in the dataset.
   * @returns
   */
  public updateLineVertices() {
    if (!this.dataset) {
      this.timeToVertexIndexRange.clear();
      this.line.geometry.setDrawRange(0, 0);
      return;
    }

    // Sort object IDs into buckets by time. Drop any IDs whose deltas are invalid (NaN).
    const timeToIds = new Map<number, number[]>();
    let totalValidIds = 0;
    for (let i = 0; i < this.dataset.numObjects; i++) {
      const time = this.dataset.getTime(i);
      if (!timeToIds.has(time)) {
        timeToIds.set(time, []);
      }
      if (Number.isNaN(this.idToVectorData[i * 2]) || Number.isNaN(this.idToVectorData[i * 2 + 1])) {
        continue;
      }
      timeToIds.get(time)!.push(i);
      totalValidIds++;
    }
    const numVertices = totalValidIds * VERTICES_PER_VECTOR_LINE;
    const vertices = new Float32Array(numVertices * 3);

    // For each ID, fill in the vertex information (centroid + delta).
    // Save the starting and ending index for each time.
    let nextEmptyIndex = 0;
    for (const [time, ids] of timeToIds) {
      this.timeToVertexIndexRange.set(time, [nextEmptyIndex, nextEmptyIndex + ids.length * VERTICES_PER_VECTOR_LINE]);

      for (const id of ids) {
        const centroid = this.dataset.getCentroid(id);
        const delta = [this.idToVectorData[id * 2], this.idToVectorData[id * 2 + 1]];
        if (centroid) {
          // Draw the main vector line segment from centroid to centroid + delta.
          // TODO: Make these all vectors
          // TODO: Perform scaling as a step in the vertex shader.
          const vectorStart: ArrayVector = [centroid[0], centroid[1], 0];
          const vectorEnd: ArrayVector = [
            centroid[0] + delta[0] * this.config.scaleFactor,
            centroid[1] + delta[1] * this.config.scaleFactor,
            0,
          ];
          const normVectorEnd = this.framePixelsToRelativeFrameCoords(vectorEnd);
          const normVectorStart = this.framePixelsToRelativeFrameCoords(vectorStart);
          vertices.set(normVectorStart, nextEmptyIndex * 3);
          vertices.set(normVectorEnd, (nextEmptyIndex + 1) * 3);

          // Draw the arrow heads. These are two line segments for each, so there's a total of four additional vertices we need to add.
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
          const arrowAngle1 = vectorAngle + arrowStyle.headAngleRads;
          const arrowAngle2 = vectorAngle - arrowStyle.headAngleRads;
          const arrowHead1: ArrayVector = [Math.cos(arrowAngle1), Math.sin(arrowAngle1), 0];
          const arrowHead2: ArrayVector = [Math.cos(arrowAngle2), Math.sin(arrowAngle2), 0];

          const lengthPx = Math.min(arrowStyle.maxHeadLengthPx, vectorLengthPx);

          // Keep arrow head length constant relative to onscreen pixels
          // Arrow heads are in screen space pixel coordinates, so we divide by canvas resolution to get relative canvas coordinates,
          // and then divide again by frameToCanvasCoordinates to get relative frame coordinates.
          arrowHead1[0] =
            (arrowHead1[0] * lengthPx) / this.frameToCanvasCoordinates.x / this.canvasResolution.x + normVectorEnd[0];
          arrowHead1[1] =
            (arrowHead1[1] * lengthPx) / this.frameToCanvasCoordinates.y / this.canvasResolution.y + normVectorEnd[1];
          arrowHead2[0] =
            (arrowHead2[0] * lengthPx) / this.frameToCanvasCoordinates.x / this.canvasResolution.x + normVectorEnd[0];
          arrowHead2[1] =
            (arrowHead2[1] * lengthPx) / this.frameToCanvasCoordinates.y / this.canvasResolution.y + normVectorEnd[1];

          vertices.set(normVectorEnd, (nextEmptyIndex + 2) * 3);
          vertices.set(arrowHead1, (nextEmptyIndex + 3) * 3);
          vertices.set(normVectorEnd, (nextEmptyIndex + 4) * 3);
          vertices.set(arrowHead2, (nextEmptyIndex + 5) * 3);
        }

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

  /**
   * Updates the scale of the vector field.
   * @param frameToCanvasCoordinates
   * @param canvasResolution
   * @returns
   */
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

  public setConfig(config: VectorConfig): void {
    this.config = config;
    // If new config changes vector length or mode, re-render all lines.
    // Update all line colors
    (this.line.material as LineBasicMaterial).color = this.config.color;
    // TODO: Only update the config if view mode changes?
    this.updateLineVertices();
  }

  public setVectorData(vectorData: Float32Array): void {
    if (this.idToVectorData !== vectorData) {
      this.idToVectorData = vectorData;
      this.updateLineVertices();
    }
  }
}
