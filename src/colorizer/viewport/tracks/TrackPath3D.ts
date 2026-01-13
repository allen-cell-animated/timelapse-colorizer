import { Line3d } from "@aics/vole-core";
import type { IDrawableObject } from "@aics/vole-core/es/types/types";
import { Color, Vector3 } from "three";

import { TrackPathColorMode } from "src/colorizer/types";
import {
  computeTrackLinePointsAndIds,
  computeVertexColorsFromIds,
  getLineUpdateFlags,
} from "src/colorizer/utils/data_utils";

import type { TrackPathParams } from "./types";

const FEATURE_BASE_COLOR = new Color("#ffffff");

/**
 * Manages the rendering of a 3D track path (trajectory) line in the 3D viewport,
 * including geometry, materials, and vertex colors.
 */
export default class TrackPath3D {
  private params: TrackPathParams | null = null;
  private volumePhysicalSize: Vector3 | null = null;

  private linePoints: Float32Array;
  private lineIds: number[];
  private lineObject: Line3d;
  /**
   * Second copy of the base line object, with transparency + overlay enabled.
   * This allows the line to be shown "through" objects.
   */
  private lineOverlayObject: Line3d;
  private lineColors: Float32Array;

  constructor() {
    this.linePoints = new Float32Array(0);
    this.lineColors = new Float32Array(0);
    this.lineIds = [];
    this.lineObject = new Line3d();
    this.lineOverlayObject = new Line3d();

    // TODO: Allow users to control opacity of the overlay line
    this.lineOverlayObject.setOpacity(0.25);
    this.lineOverlayObject.setRenderAsOverlay(true);
  }

  public getSceneObjects(): IDrawableObject[] {
    return [this.lineObject, this.lineOverlayObject];
  }

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
    const useVertexColors = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    const useColorRamp = trackPathColorMode === TrackPathColorMode.USE_COLOR_MAP;
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setColor(color, useVertexColors || useColorRamp);
      lineObject.setColorRamp(trackPathColorRamp.textureLinearSRGB, useColorRamp);
      lineObject.setLineWidth(trackPathWidthPx);
    }
  }

  public setVolumePhysicalSize(volumePhysicalSize: Vector3): void {
    if (this.volumePhysicalSize && this.volumePhysicalSize.equals(volumePhysicalSize)) {
      return;
    }
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setScale(new Vector3(1, 1, 1).divide(volumePhysicalSize));
      lineObject.setTranslation(new Vector3(-0.5, -0.5, -0.5));
    }
    this.volumePhysicalSize = volumePhysicalSize;
  }

  private updateLineGeometry(points: Float32Array, colors: Float32Array): void {
    if (!this.params || !this.params.track || !this.params.dataset) {
      return;
    }
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setLineVertexData(points, colors);
    }
  }

  /**
   * Sets parameters for the track path rendering. Returns true if a re-render
   * is needed.
   */
  public setParams(params: TrackPathParams, prevParams: TrackPathParams | null): boolean {
    const { geometryNeedsUpdate, vertexColorNeedsUpdate, materialNeedsUpdate, needsRender } = getLineUpdateFlags(
      prevParams,
      params
    );
    this.params = params;

    if (geometryNeedsUpdate || vertexColorNeedsUpdate) {
      if (geometryNeedsUpdate && params.dataset && params.track) {
        const { ids, points } = computeTrackLinePointsAndIds(params.dataset, params.track, params.showTrackPathBreaks);
        this.lineIds = ids;
        this.linePoints = points;
      }
      if (vertexColorNeedsUpdate) {
        this.lineColors = computeVertexColorsFromIds(this.lineIds, params);
      }
      this.updateLineGeometry(this.linePoints, this.lineColors);
    }
    if (materialNeedsUpdate) {
      this.updateLineMaterial();
    }
    return needsRender;
  }

  public forceUpdate(): void {
    this.updateLineMaterial();
    this.updateLineGeometry(this.linePoints, this.lineColors);
  }

  /**
   * Updates the visible range of the track path line to show the path up to
   * the current frame.
   * @param currentFrame The current frame index.
   */
  public updateVisibleRange(currentFrame: number): void {
    // Show nothing if track doesn't exist
    if (!this.params || !this.params.track || !this.params.showTrackPath) {
      this.lineObject.setVisibleSegmentsRange(0, 0);
      this.lineOverlayObject.setVisibleSegmentsRange(0, 0);
      return;
    }
    const track = this.params.track;
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

    // Update color ramp related logic
    const maxTrackLength = this.params.dataset?.getMaxTrackLength() || track.duration();
    const pastSteps = this.params.showAllTrackPathPastSteps ? maxTrackLength : this.params.trackPathPastSteps;
    const futureSteps = this.params.showAllTrackPathFutureSteps ? maxTrackLength : this.params.trackPathFutureSteps;

    const rampScale = Math.max(pastSteps, futureSteps) * 2;
    const rampOffset = trackStepIdx;
    this.lineObject.setColorRampScale(rampScale, rampOffset);
    this.lineOverlayObject.setColorRampScale(rampScale, rampOffset);
    this.lineObject.setVisibleSegmentsRange(startingInstance, Math.max(0, endingInstance));
    this.lineOverlayObject.setVisibleSegmentsRange(startingInstance, Math.max(0, endingInstance));
  }

  /**
   * Disposes of the line resources.
   */
  dispose(): void {
    this.lineObject.cleanup();
    this.lineOverlayObject.cleanup();
  }
}
