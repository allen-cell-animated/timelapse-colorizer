import { Color, Vector2 } from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry";

import {
  FRAME_BACKGROUND_COLOR_DEFAULT,
  INITIAL_TRACK_PATH_BUFFER_SIZE,
  OUTLINE_COLOR_DEFAULT,
} from "src/colorizer/constants";
import { TrackPathColorMode } from "src/colorizer/types";
import {
  computeTrackLinePointsAndIds,
  computeVertexColorsFromIds,
  getLineUpdateFlags,
} from "src/colorizer/utils/data_utils";
import CustomLineMaterial from "src/colorizer/viewport/tracks/CustomLineMaterial";

import type { TrackPathParams } from "./types";

const FEATURE_BASE_COLOR = new Color("#ffffff");

/**
 * Manages the rendering of a 2D track path (trajectory) line on the canvas,
 * including geometry, materials, and vertex colors.
 */
export default class TrackPath2D {
  /** Rendered track line that shows the trajectory of a cell. */
  private line: LineSegments2;
  /** Line used as an outline around the main line during certain coloring modes. */
  private bgLine: LineSegments2;

  /** Object IDs corresponding to each vertex in track line. */
  private lineIds: number[];
  /** Vertex positions for the track line, in pixel frame coordinates. */
  private linePoints: Float32Array;
  private lineColors: Float32Array;
  private lineBufferSize: number;

  private zoomMultiplier: number;
  private frameToCanvasScale: Vector2;
  /** XY offset of the frame, in normalized frame coordinates. [-0.5, 0.5] range. */
  private panOffset: Vector2;

  private params: TrackPathParams | null = null;

  constructor() {
    this.lineBufferSize = INITIAL_TRACK_PATH_BUFFER_SIZE;
    this.linePoints = new Float32Array(this.lineBufferSize);
    this.lineColors = new Float32Array(this.lineBufferSize);
    this.lineIds = [-1];

    const lineGeometry = new LineSegmentsGeometry();
    lineGeometry.setPositions(this.linePoints);
    const lineMaterial = new CustomLineMaterial({
      color: OUTLINE_COLOR_DEFAULT,
      linewidth: 1.0,
    });
    const bgLineMaterial = new CustomLineMaterial({
      color: FRAME_BACKGROUND_COLOR_DEFAULT,
      linewidth: 2.0,
    });

    this.line = new LineSegments2(lineGeometry, lineMaterial);
    this.bgLine = new LineSegments2(lineGeometry, bgLineMaterial);

    // Disable frustum culling for the line so it's always visible; prevents a bug
    // where the line disappears when the camera is zoomed in and panned.
    this.line.frustumCulled = false;
    this.bgLine.frustumCulled = false;

    this.bgLine.renderOrder = 0;
    this.line.renderOrder = 1;

    this.zoomMultiplier = 1.0;
    this.frameToCanvasScale = new Vector2(1, 1);
    this.panOffset = new Vector2(0, 0);
  }

  /**
   * Returns the line objects that should be added to the scene.
   */
  public getSceneObjects(): LineSegments2[] {
    return [this.bgLine, this.line];
  }

  /**
   * Updates the line geometry with new vertex positions and vertex colors.
   */
  private updateLineGeometry(points: Float32Array, colors: Float32Array): void {
    if (points.length === 0 || colors.length === 0) {
      return;
    }
    let geometry = this.line.geometry;
    // Reuse the same geometry object unless the buffer size is too small.
    // See https://threejs.org/manual/#en/how-to-update-things
    if (points.length > this.lineBufferSize) {
      geometry.dispose();
      geometry = new LineSegmentsGeometry();
      this.lineBufferSize = points.length;
    }
    geometry.setPositions(points);
    geometry.setColors(colors);

    this.line.geometry = geometry;
    this.bgLine.geometry = geometry;
  }

  /**
   * Updates the line material properties based on the current configuration.
   */
  private updateLineMaterial(): void {
    if (!this.params) {
      return;
    }
    const { trackPathColorMode, outlineColor, trackPathColor, trackPathWidthPx } = this.params;
    const modeToColor = {
      [TrackPathColorMode.USE_FEATURE_COLOR]: FEATURE_BASE_COLOR,
      [TrackPathColorMode.USE_OUTLINE_COLOR]: outlineColor,
      [TrackPathColorMode.USE_CUSTOM_COLOR]: trackPathColor,
    };
    const color = modeToColor[trackPathColorMode];
    const isColoredByFeature = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;

    // Scale line width slightly with zoom.
    const baseLineWidth = trackPathWidthPx + (this.zoomMultiplier - 1.0) * 0.5;
    this.line.material.color = color;
    this.line.material.linewidth = baseLineWidth;
    this.line.material.vertexColors = isColoredByFeature;
    this.line.material.needsUpdate = true;

    // Show line outline only when coloring by feature color
    this.bgLine.material.linewidth = isColoredByFeature ? baseLineWidth + 2 : 0;
    this.bgLine.material.needsUpdate = true;
  }

  /**
   * Sets parameters for the track path rendering. Returns true if a re-render
   * is needed.
   */
  public setParams(params: TrackPathParams, prevParams: TrackPathParams | null = null): boolean {
    this.params = params;
    const { geometryNeedsUpdate, vertexColorNeedsUpdate, materialNeedsUpdate } = getLineUpdateFlags(prevParams, params);

    if (geometryNeedsUpdate || vertexColorNeedsUpdate) {
      if (geometryNeedsUpdate && params.dataset && params.track) {
        const { ids, points } = computeTrackLinePointsAndIds(params.dataset, params.track, params.showTrackPathBreaks);
        this.lineIds = ids;
        this.linePoints = points;
      }
      if (vertexColorNeedsUpdate) {
        this.lineColors = computeVertexColorsFromIds(this.lineIds, this.params);
      }
      this.updateLineGeometry(this.linePoints, this.lineColors);
    }
    if (materialNeedsUpdate) {
      this.updateLineMaterial();
    }
    return geometryNeedsUpdate || vertexColorNeedsUpdate || materialNeedsUpdate;
  }

  public setZoom(zoom: number): void {
    this.zoomMultiplier = zoom;
    this.updateLineMaterial();
  }

  private updateLineScale(): void {
    const frameResolution = this.params?.dataset?.frameResolution || new Vector2(1, 1);
    // Normalize points (which are in pixel/voxel coordinates) to 2D canvas
    // space in a [0, 2] range (will be normalized to [-1, 1] after applying
    // position offset), then scale based on zoom level.
    this.line.scale.set(
      (2 / frameResolution.x) * this.frameToCanvasScale.x,
      -(2 / frameResolution.y) * this.frameToCanvasScale.y,
      0
    );
    // Normalize and apply panning offset (in a [-0.5, 0.5] range) and correct
    // the normalization performed in scaling step above from [0, 2] to [-1, 1].
    // Apply scaling so the offset is in canvas coordinates.
    this.line.position.set(
      (2 * this.panOffset.x - 1) * this.frameToCanvasScale.x,
      (2 * this.panOffset.y + 1) * this.frameToCanvasScale.y,
      0
    );
    this.bgLine.scale.copy(this.line.scale);
    this.bgLine.position.copy(this.line.position);
  }

  public setPositionAndScale(panOffset: Vector2, frameToCanvasCoordinates: Vector2): void {
    this.panOffset = panOffset;
    this.frameToCanvasScale = frameToCanvasCoordinates;
    this.updateLineScale();
  }

  /**
   * Updates the visible range of the track path line to show the path up to
   * the current frame.
   * @param currentFrame The current frame index.
   */
  public updateVisibleRange(currentFrame: number): void {
    const track = this.params?.track;
    // Show nothing if track doesn't exist or doesn't have centroid data
    if (!track || !track.centroids || !this.params?.showTrackPath) {
      this.line.geometry.instanceCount = 0;
      return;
    }

    const trackSteps = currentFrame - track.startTime();
    let endingInstance;
    let startingInstance;

    if (this.params.showAllTrackPathPastSteps) {
      startingInstance = 0;
    } else {
      startingInstance = Math.max(0, trackSteps - this.params.trackPathPastSteps);
    }

    if (this.params.showAllTrackPathFutureSteps) {
      endingInstance = track.duration();
    } else {
      endingInstance = Math.min(trackSteps + this.params.trackPathFutureSteps, track.duration());
    }

    (this.line.material as CustomLineMaterial).minInstance = startingInstance;
    (this.bgLine.material as CustomLineMaterial).minInstance = startingInstance;
    this.line.geometry.instanceCount = Math.max(0, endingInstance);
  }

  /**
   * Disposes of the line resources.
   */
  public dispose(): void {
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.bgLine.material.dispose();
  }
}
