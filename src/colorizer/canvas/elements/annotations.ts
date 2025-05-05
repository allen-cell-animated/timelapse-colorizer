import { Vector2 } from "three";

import { BaseRenderParams, EMPTY_RENDER_INFO, RenderInfo } from "../types";

import { LabelData, LabelType } from "../../AnnotationData";

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
  borderRadiusPx: number;
  textPaddingPx: number;
};

export const defaultAnnotationStyle: AnnotationStyle = {
  markerSizePx: 6,
  borderColor: "white",
  additionalItemsOffsetPx: 3,
  scaleWithZoomPct: 0.25,
  borderRadiusPx: 2,
  textPaddingPx: 4,
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

/**
 * For a given object ID, returns its centroid in canvas pixel coordinates if
 * it's visible in the current frame. Otherwise, returns null.
 */
function getCanvasPixelCoordsFromId(id: number | null, params: AnnotationParams): Vector2 | null {
  if (id === null || params.dataset === null || params.dataset.getTime(id) !== params.frame) {
    return null;
  }
  const centroid = params.dataset.getCentroid(id);
  if (!centroid) {
    return null;
  }
  return framePixelCoordsToCanvasPixelCoords(new Vector2(centroid[0], centroid[1]), params);
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
  const pos = getCanvasPixelCoordsFromId(params.lastSelectedId, params);
  if (pos === null) {
    return;
  }
  pos.add(origin);
  ctx.strokeStyle = style.borderColor;
  const zoomScale = getMarkerScale(params, style);
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, style.markerSizePx * zoomScale, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
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
  const pos = getCanvasPixelCoordsFromId(id, params);
  if (pos === null) {
    return;
  }
  pos.add(origin);
  ctx.strokeStyle = style.borderColor;

  // Scale markers by the zoom level.
  const dampenedZoomScale = getMarkerScale(params, style);
  const scaledMarkerSizePx = style.markerSizePx * dampenedZoomScale;

  // Draw an additional marker behind the main one if there are multiple labels.
  if (labelIdx.length > 1) {
    const bgLabelData = params.labelData[labelIdx[1]];
    ctx.fillStyle = "#" + bgLabelData.options.color.getHexString();
    const offsetPos = pos.clone().addScalar(style.additionalItemsOffsetPx * dampenedZoomScale);
    ctx.beginPath();
    if (bgLabelData.options.type === LabelType.BOOLEAN) {
      ctx.arc(offsetPos.x, offsetPos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
    } else {
      ctx.roundRect(
        Math.round(offsetPos.x - scaledMarkerSizePx) - 0.5,
        Math.round(offsetPos.y - scaledMarkerSizePx) - 0.5,
        scaledMarkerSizePx * 2,
        scaledMarkerSizePx * 2,
        style.borderRadiusPx * dampenedZoomScale
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#" + labelData.options.color.getHexString();
  if (labelData.options.type === LabelType.BOOLEAN) {
    // Draw the main marker as a filled circle.
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, scaledMarkerSizePx, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Draw the main marker as a filled square, with text inside.
    // Get value (HACKY. PLEASE MAKE THIS MORE EFFICIENT.)
    let textValue = "N/A";
    for (const [value, ids] of labelData.valueToIds) {
      if (ids.has(id)) {
        textValue = value;
        break;
      }
    }
    const fontSizePx = scaledMarkerSizePx * 2 - style.textPaddingPx;
    ctx.font = `${scaledMarkerSizePx * 2}px Lato, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textSize = ctx.measureText(textValue);
    const rectHeight = Math.round(fontSizePx + style.textPaddingPx * dampenedZoomScale); // Adjust text height to fit inside the square
    const rectWidth = Math.max(rectHeight, Math.round(textSize.width + style.textPaddingPx * dampenedZoomScale)); // Add padding to the text size
    ctx.beginPath();
    ctx.roundRect(
      Math.round(pos.x - rectWidth / 2) - 0.5,
      Math.round(pos.y - rectHeight / 2) - 0.5,
      rectWidth,
      rectHeight,
      style.borderRadiusPx * dampenedZoomScale
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = style.borderColor;
    ctx.fillText(textValue, pos.x, pos.y); // Debug text
  }
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

      drawLastClickedId(origin, ctx, params, style);

      for (const [id, labelIdxs] of idsToLabels) {
        drawAnnotationMarker(origin, ctx, params, style, id, labelIdxs);
      }
    },
  };
}
