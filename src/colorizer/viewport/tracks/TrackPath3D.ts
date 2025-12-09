import { Line3d } from "@aics/vole-core";
import { IDrawableObject } from "@aics/vole-core/es/types/types";
import { Color, Vector3 } from "three";

import { TrackPathColorMode } from "src/colorizer/types";
import {
  computeTrackLinePointsAndIds,
  computeVertexColorsFromIds,
  getLineUpdateFlags,
} from "src/colorizer/utils/data_utils";

import { ITrackPath } from "./ITrackPath";
import { TrackPathParams } from "./types";

/**
 * Manages the rendering of a 3D track path (trajectory) line in the 3D viewport,
 * including geometry, materials, and vertex colors.
 */
export default class TrackPath3D implements ITrackPath {
  private params: TrackPathParams | null = null;

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
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setColor(color, trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR);
      lineObject.setLineWidth(trackPathWidthPx);
    }
  }

  public setVolumePhysicalSize(volumePhysicalSize: Vector3): void {
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setScale(new Vector3(1, 1, 1).divide(volumePhysicalSize));
      lineObject.setTranslation(new Vector3(-0.5, -0.5, -0.5));
    }
  }

  private updateLineGeometry(points: Float32Array, colors: Float32Array): void {
    if (!this.params || !this.params.track || !this.params.dataset) {
      return;
    }

    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setLineVertexData(points, colors);
    }
  }

  public getSceneObjects(): IDrawableObject[] {
    return [this.lineObject, this.lineOverlayObject];
  }

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

  public syncWithFrame(currentFrame: number): void {
    // Show nothing if track doesn't exist
    if (!this.params || !this.params.track || !this.params.showTrackPath) {
      this.lineObject.setNumSegmentsVisible(0);
      this.lineOverlayObject.setNumSegmentsVisible(0);
      return;
    }
    // Show path up to current frame
    const track = this.params.track;
    let range = currentFrame - track.startTime();
    if (range > track.duration() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }
    this.lineObject.setNumSegmentsVisible(range);
    this.lineOverlayObject.setNumSegmentsVisible(range);
  }

  dispose(): void {
    this.lineObject.cleanup();
    this.lineOverlayObject.cleanup();
  }
}
