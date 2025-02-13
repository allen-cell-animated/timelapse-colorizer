import { Vector2 } from "three";

import { BaseRenderParams, EMPTY_RENDER_INFO, RenderInfo } from "../types";

import { LabelData } from "../../AnnotationData";

export type AnnotationParams = BaseRenderParams & {
  visible: boolean;
  labelData: LabelData[];
  timeToLabelIds: Map<number, Record<number, number[]>>;
  selectedLabelIdx: number | null;
  lastSelectedId: number | null;

  frameToCanvasCoordinates: Vector2;
  frame: number;
  panOffset: Vector2;
};

export type AnnotationStyle = {
  markerSizePx: number;
  borderColor: string;
  additionalItemsOffsetPx: number;
  /** Percentage, as a number from 0 to 1, of how much to scale the annotation
   * size with the zoom level. 0 means no scaling (the marker size is fixed in
   * onscreen pixels), 1 means the annotation markers will scale linearly with
   * the zoom level (at 2x zoom the markers will be 2x bigger).
   */
  scaleWithZoomPct: number;
};

export const defaultAnnotationStyle = {
  markerSizePx: 5,
  borderColor: "white",
  additionalItemsOffsetPx: 2,
  scaleWithZoomPct: 0.25,
};

/** Transforms a 2D frame pixel coordinate into a 2D canvas pixel coordinate,
 * accounting for panning and zooming. For both, (0,0) is the top left corner.
 */
function framePixelCoordsToCanvasPixelCoords(pos: Vector2, params: AnnotationParams): Vector2 {
  // Position is in pixel coordinates of the frame. Transform to relative frame coordinates,
  // then to relative canvas coordinates, and finally into canvas pixel coordinates.
  const frameResolution = params.dataset?.frameResolution;
  if (!frameResolution) {
    return new Vector2(0, 0);
  }
  pos = pos.clone();
  pos.divide(frameResolution); // to relative frame coordinates
  pos.sub(new Vector2(0.5, 0.5)); // Center (0,0) at center of frame
  pos.add(params.panOffset.clone().multiply(new Vector2(1, -1))); // apply panning offset
  pos.multiply(params.frameToCanvasCoordinates); // to relative canvas coordinates
  pos.multiply(params.canvasSize); // to canvas pixel coordinates
  pos.add(params.canvasSize.clone().multiplyScalar(0.5)); // Move origin to top left corner
  return pos;
}

function getMarkerScale(params: AnnotationParams, style: AnnotationStyle): number {
  const zoomScale = Math.max(params.frameToCanvasCoordinates.x, params.frameToCanvasCoordinates.y);
  const dampenedZoomScale = zoomScale * style.scaleWithZoomPct + (1 - style.scaleWithZoomPct);
  return dampenedZoomScale;
}

function drawLastClickedId(
  origin: Vector2,
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle
): void {
  const id = params.lastSelectedId;
  if (id === null) {
    return;
  }
  const centroid = params.dataset?.getCentroid(id);
  if (!centroid || !params.dataset || params.dataset.getTime(id) !== params.frame) {
    return;
  }

  const pos = framePixelCoordsToCanvasPixelCoords(new Vector2(centroid[0], centroid[1]), params);
  pos.add(origin);
  ctx.strokeStyle = style.borderColor;
  const zoomScale = getMarkerScale(params, style);
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, style.markerSizePx * zoomScale, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Draws an annotation marker over the given object ID, handling zooming,
 * panning, and multiple labels.
 * @param origin Origin of the parent annotation component (should be the top
 * left corner of the canvas viewport).
 * @param ctx 2D canvas rendering context.
 * @param params The annotation parameters.
 * @param style The annotation styling.
 * @param id The object ID to render. The object's centroid will be used as the
 * marker position.
 * @param labelIdx The indices of all labels to render for this object ID. The
 * first label index in the list will be rendered as the main marker.
 */
function drawAnnotationMarker(
  origin: Vector2,
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle,
  id: number,
  labelIdx: number[]
): void {
  const labelData = params.labelData[labelIdx[0]];
  const centroid = params.dataset?.getCentroid(id);
  if (!centroid || !params.dataset) {
    return;
  }

  const pos = framePixelCoordsToCanvasPixelCoords(new Vector2(centroid[0], centroid[1]), params);
  pos.add(origin);
  ctx.strokeStyle = style.borderColor;

  // Scale markers by the zoom level.
  const dampenedZoomScale = getMarkerScale(params, style);
  const scaledMarkerSizePx = style.markerSizePx * dampenedZoomScale;

  // Draw an additional marker behind the main one if there are multiple labels.
  if (labelIdx.length > 1) {
    ctx.fillStyle = "#" + params.labelData[labelIdx[1]].color.getHexString();
    const offsetPos = pos.clone().addScalar(style.additionalItemsOffsetPx * dampenedZoomScale);
    ctx.beginPath();
    ctx.arc(offsetPos.x, offsetPos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Draw the main marker.
  ctx.fillStyle = "#" + labelData.color.getHexString();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function getAnnotationRenderer(
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle
): RenderInfo {
  if (!params.visible) {
    return EMPTY_RENDER_INFO;
  }

  return {
    sizePx: new Vector2(0, 0),
    render: (origin: Vector2) => {
      const currentLabelToIds = params.timeToLabelIds.get(params.frame) || {};

      // Remap from labels->ids to ids->labels. Adjust ordering to render the
      // currently selected label first if there is one.
      const idsToLabels = new Map<number, number[]>();
      for (const labelIdString in currentLabelToIds) {
        const labelId = parseInt(labelIdString, 10);
        const ids = currentLabelToIds[labelId];

        for (const id of ids) {
          const labels = idsToLabels.get(id) || [];
          // If the label is selected, render it first.
          if (labelId === params.selectedLabelIdx) {
            labels.unshift(labelId);
          } else {
            labels.push(labelId);
          }
          idsToLabels.set(id, labels);
        }
      }

      for (const [id, labelIdxs] of idsToLabels) {
        drawAnnotationMarker(origin, ctx, params, style, id, labelIdxs);
      }

      drawLastClickedId(origin, ctx, params, style);
    },
  };
}
