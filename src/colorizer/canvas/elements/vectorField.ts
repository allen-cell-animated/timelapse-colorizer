import { Vector2 } from "three";

import { VectorConfig } from "../../types";
import { BaseRenderParams, RenderInfo } from "../types";

export type VectorFieldParams = BaseRenderParams & {
  visible: boolean;
  config: VectorConfig;
  vectors: Float32Array | null;
  frameToCanvasCoordinates: Vector2;
  // Size of the viewport (ColorizeCanvas), contained within the canvas, in pixels.
  viewportSizePx: Vector2;
  currentFrame: number;
  zoomMultiplier: number;
  panOffset: Vector2;
};

export type VectorFieldStyle = {
  lineWidth: number;
  arrowHeadAngle: number;
  arrowHeadLengthPx: number;
};

export const defaultVectorStyle = {
  lineWidth: 1,
  arrowHeadAngle: 30,
  arrowHeadLengthPx: 5,
};

/**
 * Renders a line from an starting point, in FRAME pixel coordinates, to an end point, in
 * relative onscreen canvas pixel coordinates. Handles panning and zooming of the frame.
 * @param ctx
 * @param vectorOriginFramePx
 * @param vectorComponents
 */
function drawVector(
  ctx: CanvasRenderingContext2D,
  params: VectorFieldParams,
  style: VectorFieldStyle,
  drawOrigin: Vector2,
  vectorOriginFramePx: Vector2,
  vectorComponents: Vector2
): void {
  if (!params.dataset) {
    return;
  }
  // vector origin is in pixels from upper left corner of the frame. Normalize to
  // be [-0.5,0.5] with center of frame being (0,0).
  const frameResolution = params.dataset.frameResolution;
  const originInRelFrameCoords = vectorOriginFramePx.clone().divide(frameResolution).subScalar(0.5);

  // Offset by pan (with -y) and then scale the origin to get the offset in terms of the viewport's rendering.
  const originInRelCanvasCoords = originInRelFrameCoords
    .add(params.panOffset.clone().multiply(new Vector2(1, -1)))
    .multiply(params.frameToCanvasCoordinates);
  // Multiply by viewport pixel size to get the origin in canvas pixel coordinates.
  const originInCanvasCoordsPx = originInRelCanvasCoords.clone().multiply(params.viewportSizePx);
  // Re-normalize coordinates to 0,0 is the top left corner.
  originInCanvasCoordsPx.add(params.viewportSizePx.clone().multiplyScalar(0.5));

  const vectorOriginPx = originInCanvasCoordsPx;
  const vectorComponentsPx = vectorComponents
    .clone()
    .multiplyScalar(params.zoomMultiplier)
    .multiplyScalar(params.config.scaleFactor);
  const vectorEndPx = vectorComponentsPx.clone().add(vectorOriginPx);

  ctx.beginPath();
  ctx.moveTo(vectorOriginPx.x + drawOrigin.x, vectorOriginPx.y + drawOrigin.y);
  ctx.lineTo(vectorEndPx.x + drawOrigin.x, vectorEndPx.y + drawOrigin.y);

  // Draw arrowhead
  ctx.moveTo(vectorEndPx.x + drawOrigin.x, vectorEndPx.y + drawOrigin.y);
  const angle = Math.PI + Math.atan2(vectorComponents.y, vectorComponents.x);
  const arrowAngle1 = angle + (Math.PI * style.arrowHeadAngle) / 180;
  const arrowAngle2 = angle - (Math.PI * style.arrowHeadAngle) / 180;
  const arrowHeadLength = Math.min(style.arrowHeadLengthPx, vectorComponentsPx.length());
  const arrowHead1 = new Vector2(
    vectorEndPx.x + arrowHeadLength * Math.cos(arrowAngle1),
    vectorEndPx.y + arrowHeadLength * Math.sin(arrowAngle1)
  );
  const arrowHead2 = new Vector2(
    vectorEndPx.x + arrowHeadLength * Math.cos(arrowAngle2),
    vectorEndPx.y + arrowHeadLength * Math.sin(arrowAngle2)
  );
  ctx.lineTo(arrowHead1.x + drawOrigin.x, arrowHead1.y + drawOrigin.y);
  ctx.moveTo(vectorEndPx.x + drawOrigin.x, vectorEndPx.y + drawOrigin.y);
  ctx.lineTo(arrowHead2.x + drawOrigin.x, arrowHead2.y + drawOrigin.y);

  ctx.stroke();
  ctx.closePath();
}

function renderVectorField(
  ctx: CanvasRenderingContext2D,
  params: VectorFieldParams,
  style: VectorFieldStyle,
  origin: Vector2
): void {
  const vectors = params.vectors;
  if (!params.dataset || vectors === null) {
    return;
  }
  const visibleIds = params.dataset.getIdsAtTime(params.currentFrame);
  if (!visibleIds) {
    return;
  }

  const visibleIdToVector: Map<number, [number, number]> = new Map(
    visibleIds.map((id): [number, [number, number]] => {
      const delta: [number, number] = [vectors[id * 2], vectors[id * 2 + 1]];
      return [id, delta];
    })
  );

  // Render the vector field
  ctx.lineWidth = style.lineWidth;
  ctx.strokeStyle = params.config.color.getHexString();

  for (const [id, delta] of visibleIdToVector) {
    const centroid = params.dataset.getCentroid(id);
    if (!centroid || !delta || Number.isNaN(delta[0]) || Number.isNaN(delta[1])) {
      continue;
    }

    const vectorOriginFramePx = new Vector2(centroid[0], centroid[1]);
    const vectorComponents = new Vector2(delta[0], delta[1]).multiplyScalar(2.0);
    drawVector(ctx, params, style, origin, vectorOriginFramePx, vectorComponents);
  }
}

export function getVectorFieldRenderer(
  ctx: CanvasRenderingContext2D,
  params: VectorFieldParams,
  style: VectorFieldStyle = defaultVectorStyle
): RenderInfo {
  const sizePx = params.canvasSize.clone();

  return {
    sizePx,
    render: (origin = new Vector2(0, 0)) => {
      if (!params.visible) {
        return;
      }

      // get the motion deltas for the current frame
      renderVectorField(ctx, params, style, origin);
    },
  };
}
