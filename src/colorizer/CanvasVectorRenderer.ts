import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, LineSegments, Scene, Vector2 } from "three";

import { getDefaultVectorConfig, VectorConfig } from "./types";

import Dataset from "./Dataset";

// TODO: eventually increase this to 6 when adding arrow heads.
const VERTICES_PER_VECTOR_LINE = 2;

export default class CanvasVectorRenderer {
  private dataset: Dataset | null;
  private scene: Scene;
  // Recycles line objects to avoid creating new ones every frame.
  private line: Line;
  private lineConfig: VectorConfig;
  private motionDeltas: Float32Array;
  private timeToVertexIndexRange: Map<number, [number, number]>;
  private currentFrame: number;

  constructor(scene: Scene) {
    this.dataset = null;
    this.scene = scene;
    this.lineConfig = getDefaultVectorConfig();
    this.currentFrame = 0;

    const lineGeometry = new BufferGeometry();
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
          vertices[nextEmptyIndex * 3] = this.normalizeX(centroid[0]);
          vertices[nextEmptyIndex * 3 + 1] = this.normalizeY(centroid[1]);
          vertices[nextEmptyIndex * 3 + 2] = 0;
          // End
          vertices[nextEmptyIndex * 3 + 3] = this.normalizeX(centroid[0] + delta[0] * this.lineConfig.scaleFactor);
          vertices[nextEmptyIndex * 3 + 4] = this.normalizeY(centroid[1] + delta[1] * this.lineConfig.scaleFactor);
          vertices[nextEmptyIndex * 3 + 5] = 0;
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

  public setScale(frameToCanvasCoordinates: Vector2) {
    this.line.scale.set(frameToCanvasCoordinates.x, frameToCanvasCoordinates.y, 1);
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
