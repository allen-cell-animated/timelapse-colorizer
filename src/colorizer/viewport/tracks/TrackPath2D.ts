import { Color, type Vector2 } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial";
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
  normalizePointsTo2dCanvasSpace,
} from "src/colorizer/utils/data_utils";

import type { ITrackPath } from "./ITrackPath";
import type { TrackPathParams } from "./types";

/**
 * Manages the rendering of a 2D track path (trajectory) line on the canvas,
 * including geometry, materials, and vertex colors.
 */
export default class TrackPath2D implements ITrackPath {
  /** Rendered track line that shows the trajectory of a cell. */
  private line: LineSegments2;
  /** Line used as an outline around the main line during certain coloring modes. */
  private bgLine: LineSegments2;

  /** Object IDs corresponding to each vertex in track line. */
  private lineIds: number[];
  private linePoints: Float32Array;
  private lineColors: Float32Array;
  private lineBufferSize: number;

  private zoomMultiplier: number;

  private params: TrackPathParams | null = null;

  constructor() {
    this.lineBufferSize = INITIAL_TRACK_PATH_BUFFER_SIZE;
    this.linePoints = new Float32Array(this.lineBufferSize);
    this.lineColors = new Float32Array(this.lineBufferSize);
    this.lineIds = [-1];

    const lineGeometry = new LineSegmentsGeometry();
    lineGeometry.setPositions(this.linePoints);
    const lineMaterial = new LineMaterial({
      color: OUTLINE_COLOR_DEFAULT,
      linewidth: 1.0,
    });
    const bgLineMaterial = new LineMaterial({
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
  }

  /**
   * Returns the line scene objects that should be added to the scene.
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
      [TrackPathColorMode.USE_FEATURE_COLOR]: new Color("#ffffff"),
      [TrackPathColorMode.USE_OUTLINE_COLOR]: outlineColor,
      [TrackPathColorMode.USE_CUSTOM_COLOR]: trackPathColor,
    };
    const color = modeToColor[trackPathColorMode];

    // Scale line width slightly with zoom.
    const baseLineWidth = trackPathWidthPx + (this.zoomMultiplier - 1.0) * 0.5;
    this.line.material.color = color;
    this.line.material.linewidth = baseLineWidth;
    this.line.material.vertexColors = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    this.line.material.needsUpdate = true;

    // Show line outline only when coloring by feature color
    const isColoredByFeature = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    this.bgLine.material.linewidth = isColoredByFeature ? baseLineWidth + 2 : 0;
    this.bgLine.material.needsUpdate = true;
  }

  public setParams(params: TrackPathParams, prevParams: TrackPathParams | null = null): boolean {
    this.params = params;
    const { geometryNeedsUpdate, vertexColorNeedsUpdate, materialNeedsUpdate } = getLineUpdateFlags(prevParams, params);

    if (geometryNeedsUpdate || vertexColorNeedsUpdate) {
      if (geometryNeedsUpdate && params.dataset && params.track) {
        const { ids, points } = computeTrackLinePointsAndIds(params.dataset, params.track, params.showTrackPathBreaks);
        this.lineIds = ids;
        this.linePoints = normalizePointsTo2dCanvasSpace(points, params.dataset);
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

  public setPositionAndScale(panOffset: Vector2, frameToCanvasCoordinates: Vector2): void {
    this.line.scale.set(frameToCanvasCoordinates.x, frameToCanvasCoordinates.y, 1);
    this.line.position.set(
      2 * panOffset.x * frameToCanvasCoordinates.x,
      2 * panOffset.y * frameToCanvasCoordinates.y,
      0
    );
    this.bgLine.scale.copy(this.line.scale);
    this.bgLine.position.copy(this.line.position);
  }

  /**
   * Updates the visible range of the track path line to show the path up to
   * the current frame.
   * @param currentFrame The current frame index.
   */
  public syncWithFrame(currentFrame: number): void {
    const track = this.params?.track;
    // Show nothing if track doesn't exist or doesn't have centroid data
    if (!track || !track.centroids || !this.params?.showTrackPath) {
      this.line.geometry.instanceCount = 0;
      return;
    }

    // Show path up to current frame
    let range = currentFrame - track.startTime();

    if (range >= track.duration() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }

    this.line.geometry.instanceCount = Math.max(0, range);
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
