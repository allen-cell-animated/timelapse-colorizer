import { type Matrix4, Vector2, Vector3 } from "three";

import { type LabelData, LabelType } from "src/colorizer/AnnotationData";
import type { PixelIdInfo } from "src/colorizer/types";
import { defaultFontStyle, EMPTY_RENDER_INFO } from "src/colorizer/viewport/overlays/constants";
import type { BaseRenderParams, FontStyle, RenderInfo } from "src/colorizer/viewport/overlays/types";

export type AnnotationParams = BaseRenderParams & {
  visible: boolean;
  labelData: LabelData[];
  timeToLabelIds: Map<number, Record<number, number[]>>;
  selectedLabelIdx: number | null;
  rangeStartId: number | null;
  getIdAtPixel: ((x: number, y: number) => PixelIdInfo | null) | null;
  depthToScale: (depth: number) => { scale: number; clipOpacity: number };
  centroidToCanvasMatrix: Matrix4;
  frame: number;
};

export type AnnotationStyle = FontStyle & {
  booleanMarkerRadiusPx: number;
  borderColor: string;
  textExtraItemsOffsetPx: number;
  booleanExtraItemsOffsetPx: number;
  /** Percentage, as a number from 0 to 1, of how much to scale the annotation
   * size with the zoom level. 0 means no scaling (the marker size is fixed in
   * onscreen pixels), 1 means the annotation markers will scale linearly with
   * the zoom level (at 2x zoom the markers will be 2x bigger).
   */
  scaleWithZoomPct: number;
  borderRadiusPx: number;
  /** Horizontal padding, on left and right. */
  textPaddingPx: number;
  textPaddingTopPx: number;
  textPaddingBottomPx: number;
  maxTextCharacters: number;
};

export const defaultAnnotationStyle: AnnotationStyle = {
  ...defaultFontStyle,
  fontColor: "white",
  fontSizePx: 10,
  booleanMarkerRadiusPx: 5,
  borderColor: "white",
  textExtraItemsOffsetPx: 5,
  booleanExtraItemsOffsetPx: 3,
  scaleWithZoomPct: 0.25,
  borderRadiusPx: 2,
  textPaddingPx: 2,
  textPaddingTopPx: 2,
  textPaddingBottomPx: 2,
  maxTextCharacters: 20,
};

type MarkerData = {
  pos3d: Vector3;
  id: number;
  labelIdx: number[];
};

/**
 * Sorts marker data so that markers with the currently selected label are at
 * the start of the list, and then are sorted by Z depth in ascending order.
 */
function makeMarkerSorter(selectedLabelIdx: number | null): (a: MarkerData, b: MarkerData) => number {
  return (a: MarkerData, b: MarkerData): number => {
    // Sort by whether the object has the currently selected label
    if (selectedLabelIdx !== null) {
      const aSelected = a.labelIdx[0] === selectedLabelIdx;
      const bSelected = b.labelIdx[0] === selectedLabelIdx;
      if (aSelected && !bSelected) {
        return -1; // a comes first
      } else if (!aSelected && bSelected) {
        return 1; // b comes first
      }
    }
    // If both have equal label priority, sort by Z depth.
    const zDiff = a.pos3d.z - b.pos3d.z;
    return zDiff;
  };
}

/**
 * For a given object ID, returns its centroid in canvas pixel coordinates if
 * it's visible in the current frame. Otherwise, returns null.
 */
function getCanvasPixelCoordsFromId(id: number, params: AnnotationParams): Vector3 | null {
  if (params.dataset === null || params.dataset.getTime(id) !== params.frame) {
    return null;
  }
  const centroid = params.dataset.getCentroid(id);
  if (!centroid) {
    return null;
  }
  const centroidPos = new Vector3(...centroid);
  return centroidPos.applyMatrix4(params.centroidToCanvasMatrix);
}

function dampenScaleValue(rawScale: number, style: AnnotationStyle): number {
  return rawScale * style.scaleWithZoomPct + (1 - style.scaleWithZoomPct);
}

function drawRangeStartId(
  origin: Vector2,
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle
): void {
  if (params.rangeStartId === null) {
    return;
  }
  const pos3d = getCanvasPixelCoordsFromId(params.rangeStartId, params);
  if (pos3d === null) {
    return;
  }
  const pos = new Vector2(pos3d.x, pos3d.y);
  pos.add(origin);

  ctx.strokeStyle = style.borderColor;
  const { scale } = params.depthToScale(pos3d.z);
  const zoomScale = dampenScaleValue(scale, style);
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  const radius = Math.max(style.booleanMarkerRadiusPx * zoomScale, 0);
  ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
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
  info: MarkerData
): void {
  const { id, labelIdx, pos3d } = info;

  const labelData = params.labelData[labelIdx[0]];
  const pos = new Vector2(pos3d.x, pos3d.y);
  const { scale, clipOpacity } = params.depthToScale(pos3d.z);

  // TODO: getIdAtPixel is very expensive and can cause performance issues when
  // annotations are being updated without the view moving (like when a user is
  // editing a value or is adding annotations). Turn annotation rendering into a
  // class and cache the getIdAtPixel result for the current frame, invalidating
  // it whenever the transform matrix or current frame changes.
  if (params.getIdAtPixel !== null) {
    const pixelIdInfo = params.getIdAtPixel(pos.x, pos.y);
    const isObscured = pixelIdInfo !== null && pixelIdInfo.globalId !== id;
    ctx.globalAlpha = isObscured ? clipOpacity : 1;
  } else {
    ctx.globalAlpha = 1;
  }

  pos.add(origin);
  ctx.strokeStyle = style.borderColor;

  // Scale markers by the zoom level.
  const isBooleanLabel = labelData.options.type === LabelType.BOOLEAN;
  const dampenedZoomScale = dampenScaleValue(scale, style);
  const scaledBooleanMarkerRadiusPx = Math.max(0, style.booleanMarkerRadiusPx * dampenedZoomScale);

  // Draw an additional secondary marker behind the main one if there are multiple labels.
  if (labelIdx.length > 1) {
    const bgLabelData = params.labelData[labelIdx[1]];
    ctx.fillStyle = "#" + bgLabelData.options.color.getHexString();
    // Vary offset based on the type of the main label
    const offsetPx = isBooleanLabel ? style.booleanExtraItemsOffsetPx : style.textExtraItemsOffsetPx;
    const offsetPos = pos.clone().addScalar(offsetPx * dampenedZoomScale);
    ctx.beginPath();
    if (bgLabelData.options.type === LabelType.BOOLEAN) {
      // Draw BG circle for boolean labels
      ctx.arc(offsetPos.x, offsetPos.y, scaledBooleanMarkerRadiusPx, 0, 2 * Math.PI);
    } else {
      // Draw BG rectangle with rounded corners for text labels
      // Increase size slightly more if the main label is also rectangular, since it's otherwise
      // very hard to see the label.
      const rectHeight = scaledBooleanMarkerRadiusPx + (isBooleanLabel ? 0 : 1 * dampenedZoomScale);
      ctx.roundRect(
        Math.round(offsetPos.x - rectHeight) - 0.5,
        Math.round(offsetPos.y - rectHeight) - 0.5,
        rectHeight * 2,
        rectHeight * 2,
        style.borderRadiusPx * dampenedZoomScale
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Draw the main marker.
  ctx.fillStyle = "#" + labelData.options.color.getHexString();
  if (labelData.options.type === LabelType.BOOLEAN) {
    // Draw the main marker as a filled circle.
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, scaledBooleanMarkerRadiusPx, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Draw a rectangle with rounded corners that contains a text label.
    let textValue = labelData.idToValue.get(id) || "";
    if (textValue.length > style.maxTextCharacters) {
      textValue = textValue.slice(0, style.maxTextCharacters - 3) + "...";
    }
    const fontSizePx = style.fontSizePx * dampenedZoomScale;
    ctx.font = `${fontSizePx}px ${style.fontFamily}, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textSize = ctx.measureText(textValue);
    const rectHeight = Math.floor(
      (style.fontSizePx + style.textPaddingTopPx + style.textPaddingBottomPx) * dampenedZoomScale
    );
    const rectWidth = Math.max(rectHeight, Math.ceil(textSize.width + style.textPaddingPx * 2 * dampenedZoomScale)); // Add padding to the text size
    const rectPosX = Math.round(pos.x - rectWidth / 2) - 0.5;
    const rectPosY = Math.round(pos.y - rectHeight / 2) - 0.5;
    ctx.beginPath();
    ctx.roundRect(rectPosX, rectPosY, rectWidth, rectHeight, style.borderRadiusPx * dampenedZoomScale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = style.fontColor;
    ctx.fillText(
      textValue,
      Math.round(pos.x),
      Math.round(rectPosY + style.textPaddingTopPx * dampenedZoomScale + fontSizePx / 2)
    );
  }
}

export function getAnnotationRenderer(
  ctx: CanvasRenderingContext2D,
  params: AnnotationParams,
  style: AnnotationStyle
): RenderInfo {
  if (!params.visible || !params.dataset) {
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

      // Map to marker params and sort by Z depth + selected label
      const markerData: MarkerData[] = [];
      for (const [id, labelIdxs] of idsToLabels) {
        const pos3d = getCanvasPixelCoordsFromId(id, params);
        if (pos3d !== null) {
          markerData.push({ pos3d, id, labelIdx: labelIdxs });
        }
      }
      markerData.sort(makeMarkerSorter(params.selectedLabelIdx));

      drawRangeStartId(origin, ctx, params, style);

      // Draw each marker in reverse order so the highest priority labels are drawn last
      for (let i = markerData.length - 1; i >= 0; i--) {
        const info = markerData[i];
        drawAnnotationMarker(origin, ctx, params, style, info);
      }
    },
  };
}
