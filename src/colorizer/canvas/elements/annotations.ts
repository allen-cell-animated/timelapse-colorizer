import { Vector2 } from "three";

import { BaseRenderParams, EMPTY_RENDER_INFO, RenderInfo } from "../types";

import { LabelData } from "../../AnnotationData";

export type AnnotationParams = BaseRenderParams & {
  visible: boolean;
  labelData: LabelData[];
  timeToLabelIds: Map<number, Record<number, number[]>>;
  selectedLabelIdx: number | null;

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

function drawAnnotation(
  origin: Vector2,
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle,
  id: number,
  labelIdx: number[]
): void {
  const labelData = params.labelData[labelIdx[0]];
  const centroid = params.dataset?.getCentroid(id);
  const frameResolution = params.dataset?.frameResolution;
  if (!centroid || !frameResolution) {
    return;
  }

  // Position is in pixel coordinates of the frame. Transform to relative frame coordinates,
  // then to relative canvas coordinates, and finally into canvas pixel coordinates.
  const pos = new Vector2(centroid[0], centroid[1]);
  pos.divide(frameResolution); // to relative frame coordinates
  pos.sub(new Vector2(0.5, 0.5)); // Center (0,0) at center of frame
  pos.add(params.panOffset.clone().multiply(new Vector2(1, -1))); // apply panning offset
  pos.multiply(params.frameToCanvasCoordinates); // to relative canvas coordinates
  pos.multiply(params.canvasSize); // to canvas pixel coordinates
  pos.add(params.canvasSize.clone().multiplyScalar(0.5)); // Move origin to top left corner

  const renderPos = new Vector2(pos.x + origin.x, pos.y + origin.y);
  ctx.strokeStyle = style.borderColor;

  // Scale icons by the zoom level.
  const zoomScale = Math.max(params.frameToCanvasCoordinates.x, params.frameToCanvasCoordinates.y);
  const dampenedZoomScale = zoomScale * style.scaleWithZoomPct + (1 - style.scaleWithZoomPct);
  const scaledMarkerSizePx = style.markerSizePx * dampenedZoomScale;

  // Render an extra outline if multiple labels are present.
  if (labelIdx.length > 1) {
    ctx.fillStyle = "#" + params.labelData[labelIdx[1]].color.getHexString();
    const offsetRenderPos = renderPos.clone().addScalar(style.additionalItemsOffsetPx * dampenedZoomScale);
    ctx.beginPath();
    ctx.arc(offsetRenderPos.x, offsetRenderPos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Draw the marker at the new position.
  ctx.fillStyle = "#" + labelData.color.getHexString();
  ctx.beginPath();
  ctx.arc(renderPos.x, renderPos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
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
        drawAnnotation(origin, ctx, params, style, id, labelIdxs);
      }
    },
  };
}
