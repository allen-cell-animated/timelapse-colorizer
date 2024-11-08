import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, LineSegments, Scene, Vector2 } from "three";

import { getDefaultVectorConfig, VectorConfig } from "./types";

import Dataset from "./Dataset";

// TODO: eventually increase this to 6 when adding arrow heads.
const VERTICES_PER_VECTOR_LINE = 6;
const ANGLE_TO_RADIANS = Math.PI / 180;

const arrowStyle = {
  headAngleRads: 30 * ANGLE_TO_RADIANS,
  maxHeadLengthPx: 8,
};

type ArrayVector = [number, number, number];

export default class CanvasVectorRenderer {
  private dataset: Dataset | null;
  private scene: Scene;
  // Recycles line objects to avoid creating new ones every frame.
  private line: Line;
  private lineConfig: VectorConfig;
  private motionDeltas: Float32Array;
  private timeToVertexIndexRange: Map<number, [number, number]>;
  private currentFrame: number;
  private canvasResolution: Vector2;
  private frameToCanvasCoordinates: Vector2;

  constructor(scene: Scene) {
    this.dataset = null;
    this.scene = scene;
    this.lineConfig = getDefaultVectorConfig();
    this.currentFrame = 0;
    this.canvasResolution = new Vector2();
    this.frameToCanvasCoordinates = new Vector2();

    const lineGeometry = new BufferGeometry();
    // TODO: handle arrow length + arrow head size in the vertex shader
    const lineMaterial = new LineBasicMaterial({
      color: this.lineConfig.color,
      linewidth: 1,
    });
    this.line = new LineSegments(lineGeometry, lineMaterial);
    this.line.frustumCulled = false;
    this.timeToVertexIndexRange = new Map();

    this.motionDeltas = new Float32Array();

    this.scene.add(this.line);
  }

  public setFrame(frame: number) {
    // Update vertex geometry range to render.
    this.currentFrame = frame;
    const range = this.timeToVertexIndexRange.get(frame);
    if (range) {
      console.log("Setting draw range to " + range[0] + " to " + range[1]);

      this.line.geometry.setDrawRange(range[0], range[1] - range[0]);
    } else {
      this.line.geometry.setDrawRange(0, 0);
    }
  }

  private normalizeX(x: number): number {
    if (!this.dataset) {
      return 0;
    }
    return (x / this.dataset.frameResolution.x) * 2.0 - 1.0;
  }
  private normalizeY(y: number): number {
    if (!this.dataset) {
      return 0;
    }
    return -(y / this.dataset.frameResolution.y) * 2.0 + 1.0;
  }

  private normFrameCoordsToRelCanvasCoords(vector: ArrayVector): ArrayVector {
    return [this.normalizeX(vector[0]), this.normalizeY(vector[1]), vector[2]];
  }

  private normRelCanvasCoordsToScreenSpaceCoords(vector: ArrayVector): ArrayVector {
    return [vector[0] * this.canvasResolution.x, vector[1] * this.canvasResolution.y, vector[2]];
  }

  public updateLineVertices() {
    if (!this.dataset) {
      this.timeToVertexIndexRange.clear();
      this.line.geometry.setDrawRange(0, 0);
      return;
    }
    console.time("updateLineVertices");

    // Sort object IDs into buckets by time. Drop any IDs whose deltas are invalid (NaN).
    const timeToIds = new Map<number, number[]>();
    let totalValidIds = 0;
    for (let i = 0; i < this.dataset.numObjects; i++) {
      const time = this.dataset.getTime(i);
      if (!timeToIds.has(time)) {
        timeToIds.set(time, []);
      }
      if (Number.isNaN(this.motionDeltas[i * 2]) || Number.isNaN(this.motionDeltas[i * 2 + 1])) {
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
        const delta = [this.motionDeltas[id * 2], this.motionDeltas[id * 2 + 1]];
        if (centroid) {
          // Origin
          const vectorStart: ArrayVector = [centroid[0], centroid[1], 0];
          const vectorEnd: ArrayVector = [
            centroid[0] + delta[0] * this.lineConfig.scaleFactor,
            centroid[1] + delta[1] * this.lineConfig.scaleFactor,
            0,
          ];
          const normVectorEnd = this.normFrameCoordsToRelCanvasCoords(vectorEnd);
          const normVectorStart = this.normFrameCoordsToRelCanvasCoords(vectorStart);
          vertices.set(normVectorStart, nextEmptyIndex * 3);
          vertices.set(normVectorEnd, (nextEmptyIndex + 1) * 3);

          // Vertices for the two arrow heads
          // TODO: this should actually operate after vector normalization, since the
          // arrow head length is in terms of screen space coords.
          const screenSpaceStartPx = this.normRelCanvasCoordsToScreenSpaceCoords(normVectorStart);
          const screenSpaceEndPx = this.normRelCanvasCoordsToScreenSpaceCoords(normVectorEnd);
          const screenSpaceDeltaPx = [
            screenSpaceEndPx[0] - screenSpaceStartPx[0],
            screenSpaceEndPx[1] - screenSpaceStartPx[1],
          ];
          const vectorLengthPx = Math.sqrt(
            screenSpaceDeltaPx[0] * screenSpaceDeltaPx[0] + screenSpaceDeltaPx[1] * screenSpaceDeltaPx[1]
          );

          const vectorAngle = Math.atan2(delta[1], delta[0]) + Math.PI;
          const arrowAngle1 = vectorAngle + arrowStyle.headAngleRads;
          const arrowAngle2 = vectorAngle - arrowStyle.headAngleRads;
          // Keep arrow head length constant relative to onscreen pixels
          // const arrowHeadLength =
          const arrowHead1: ArrayVector = [Math.cos(arrowAngle1), Math.sin(arrowAngle1), 0];
          const arrowHead2: ArrayVector = [Math.cos(arrowAngle2), Math.sin(arrowAngle2), 0];

          // Scale to keep arrow head length constant.
          const lengthPx = Math.min(arrowStyle.maxHeadLengthPx, vectorLengthPx);
          arrowHead1[0] =
            ((arrowHead1[0] / this.frameToCanvasCoordinates.x) * this.canvasResolution.x * lengthPx) /
              this.canvasResolution.x +
            vectorEnd[0];
          arrowHead1[1] =
            ((arrowHead1[1] / this.frameToCanvasCoordinates.y) * this.canvasResolution.y * lengthPx) /
              this.canvasResolution.y +
            vectorEnd[1];
          arrowHead2[0] =
            ((arrowHead2[0] / this.frameToCanvasCoordinates.x) * this.canvasResolution.x * lengthPx) /
              this.canvasResolution.x +
            vectorEnd[0];
          arrowHead2[1] =
            ((arrowHead2[1] / this.frameToCanvasCoordinates.y) * this.canvasResolution.y * lengthPx) /
              this.canvasResolution.y +
            vectorEnd[1];

          vertices.set(normVectorEnd, (nextEmptyIndex + 2) * 3);
          vertices.set(this.normFrameCoordsToRelCanvasCoords(arrowHead1), (nextEmptyIndex + 3) * 3);
          vertices.set(normVectorEnd, (nextEmptyIndex + 4) * 3);
          vertices.set(this.normFrameCoordsToRelCanvasCoords(arrowHead2), (nextEmptyIndex + 5) * 3);
        }

        nextEmptyIndex += VERTICES_PER_VECTOR_LINE;
      }
    }

    // Update line buffer geometry
    console.log("Line has " + numVertices + " vertices.");
    const lineGeometry = this.line.geometry as BufferGeometry;
    lineGeometry.setAttribute("position", new BufferAttribute(vertices, 3));
    // lineGeometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 0.5, 0.5, 0]), 3));
    // lineGeometry.setDrawRange(0, 2);
    lineGeometry.getAttribute("position").needsUpdate = true;

    // Update frame range
    this.setFrame(this.currentFrame);
    console.timeEnd("updateLineVertices");
  }

  public setDataset(dataset: Dataset) {
    if (this.dataset !== dataset) {
      this.dataset = dataset;
      this.updateLineVertices();
    }
  }

  public setScale(frameToCanvasCoordinates: Vector2, canvasResolution: Vector2) {
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

  public setPosition(panOffset: Vector2, frameToCanvasCoordinates: Vector2) {
    this.line.position.set(
      2 * panOffset.x * frameToCanvasCoordinates.x,
      2 * panOffset.y * frameToCanvasCoordinates.y,
      0
    );
  }

  public setConfig(config: VectorConfig) {
    this.lineConfig = config;
    // If new config changes vector length or mode, re-render all lines.
    // Update all line colors
    (this.line.material as LineBasicMaterial).color = this.lineConfig.color;
    // Compare config?
    this.updateLineVertices();
  }

  public setMotionDeltas(motionDeltas: Float32Array) {
    if (this.motionDeltas !== motionDeltas) {
      this.motionDeltas = motionDeltas;
      this.updateLineVertices();
    }
  }
}
