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
import SubrangeLineMaterial from "src/colorizer/viewport/tracks/SubrangeLineMaterial";

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
    const lineMaterial = new SubrangeLineMaterial({
      color: OUTLINE_COLOR_DEFAULT,
      linewidth: 1.0,
    });
    const bgLineMaterial = new SubrangeLineMaterial({
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
    const { trackPathColorMode, trackPathColorRamp, outlineColor, trackPathColor, trackPathWidthPx } = this.params;
    const modeToColor = {
      [TrackPathColorMode.USE_FEATURE_COLOR]: FEATURE_BASE_COLOR,
      [TrackPathColorMode.USE_OUTLINE_COLOR]: outlineColor,
      [TrackPathColorMode.USE_CUSTOM_COLOR]: trackPathColor,
      [TrackPathColorMode.USE_COLOR_MAP]: FEATURE_BASE_COLOR,
    };
    const color = modeToColor[trackPathColorMode];
    const isColoredByFeature = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    const isColoredByRamp = trackPathColorMode === TrackPathColorMode.USE_COLOR_MAP;

    // Scale line width slightly with zoom.
    const baseLineWidth = trackPathWidthPx + (this.zoomMultiplier - 1.0) * 0.5;
    this.line.material.color = color;
    this.line.material.linewidth = baseLineWidth;
    this.line.material.vertexColors = isColoredByFeature || isColoredByRamp;

    // Apply color ramp
    (this.line.material as SubrangeLineMaterial).useColorRamp = isColoredByRamp;
    (this.line.material as SubrangeLineMaterial).colorRamp = trackPathColorRamp.textureLinearSRGB;

    // Show line outline only when coloring by feature color
    this.bgLine.material.linewidth = isColoredByFeature ? baseLineWidth + 2 : 0;

    this.line.material.needsUpdate = true;
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
    // Normalize points which are in pixel/voxel coordinates to 2D canvas
    // space in a [0, 2] range, flip the Y axis, and scale based on zoom level.
    // Range will be adjusted to [-1, 1] in the position update below.
    this.line.scale.set(
      (2 / frameResolution.x) * this.frameToCanvasScale.x,
      -(2 / frameResolution.y) * this.frameToCanvasScale.y,
      0
    );
    // Normalize and apply panning offset (from a [-0.5, 0.5] to a [-1, 1]
    // range) and correct the normalization performed in scaling step from
    // [0, 2] to [-1, 1]. Apply scaling so the offset is in canvas coordinates.
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

    const trackStepIdx = currentFrame - track.startTime();
    let endingInstance;
    let startingInstance;

    if (this.params.showAllTrackPathPastSteps) {
      startingInstance = 0;
    } else {
      startingInstance = Math.max(0, trackStepIdx - this.params.trackPathPastSteps);
    }

    if (this.params.showAllTrackPathFutureSteps) {
      endingInstance = track.duration();
    } else {
      endingInstance = Math.min(trackStepIdx + this.params.trackPathFutureSteps, track.duration());
    }

    // Check if the path should be hidden entirely because it is outside of the
    // range. This happens when all past paths are shown and the track has ended,
    // or if all future paths are shown and the track has not yet started.
    if (!this.params.persistTrackPathWhenOutOfRange) {
      const isVisiblePastEnd = this.params.showAllTrackPathPastSteps && trackStepIdx >= track.duration();
      const isVisibleBeforeStart = this.params.showAllTrackPathFutureSteps && trackStepIdx < 0;
      if (isVisiblePastEnd || isVisibleBeforeStart) {
        startingInstance = 0;
        endingInstance = 0;
      }
    }

    if (
      !(this.line.material instanceof SubrangeLineMaterial) ||
      !(this.bgLine.material instanceof SubrangeLineMaterial)
    ) {
      return;
    }

    // Update color ramp related logic
    const maxTrackLength = this.params.dataset?.getMaxTrackLength() || track.duration();
    const pastSteps = this.params.showAllTrackPathPastSteps ? maxTrackLength : this.params.trackPathPastSteps;
    const futureSteps = this.params.showAllTrackPathFutureSteps ? maxTrackLength : this.params.trackPathFutureSteps;
    this.line.material.colorRampVertexOffset = trackStepIdx;
    this.line.material.colorRampVertexScale = Math.max(pastSteps, futureSteps) * 2;

    this.line.material.minInstance = startingInstance;
    this.bgLine.material.minInstance = startingInstance;
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
