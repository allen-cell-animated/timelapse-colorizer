import { Vector2 } from "three";

import { VectorConfig } from "../../types";
import { getMotionDeltas } from "../../utils/data_utils";
import { BaseRenderParams, RenderInfo } from "../types";

export type VectorFieldParams = BaseRenderParams & {
  config: VectorConfig;
  frameToCanvasCoordinates: Vector2;
  // Size of the viewport (ColorizeCanvas), contained within the canvas, in pixels.
  viewportSizePx: Vector2;
  currentFrame: number;
  zoomMultiplier: number;
  panOffset: Vector2;
};

export type VectorFieldStyle = {
  lineWidth: number;
};

export const defaultVectorStyle = {
  lineWidth: 1,
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
  const originInRelFrameCoords = vectorOriginFramePx.clone().divide(frameResolution).subScalar(1.0);

  // Offset by pan and then scale the origin to get the offset in terms of the viewport's rendering.
  const originInRelCanvasCoords = originInRelFrameCoords
    .add(params.panOffset)
    .multiply(params.frameToCanvasCoordinates);
  // Multiply by viewport pixel size to get the origin in canvas pixel coordinates.
  const originInCanvasCoordsPx = originInRelCanvasCoords.clone().multiply(params.viewportSizePx);

  const vectorOriginPx = originInCanvasCoordsPx.clone().add(drawOrigin);
  // TODO: scale this by zoom level?? magnitude???
  const vectorEndPx = vectorOriginPx.clone().add(vectorComponents).multiply(params.viewportSizePx);

  ctx.beginPath();
  ctx.moveTo(vectorOriginPx.x, vectorOriginPx.y);
  ctx.lineTo(vectorEndPx.x, vectorEndPx.y);
  ctx.stroke();
  ctx.closePath();
}

function renderVectorField(
  ctx: CanvasRenderingContext2D,
  params: VectorFieldParams,
  style: VectorFieldStyle,
  origin: Vector2
): void {
  if (!params.dataset) {
    return;
  }

  const visibleIdToVector = getMotionDeltas(params.dataset, params.currentFrame, params.config.timesteps);
  // Render the vector field
  ctx.lineWidth = style.lineWidth;
  ctx.strokeStyle = params.config.color.getHexString();

  for (const [id, delta] of visibleIdToVector) {
    const centroid = params.dataset.getCentroid(id);
    if (!centroid || !delta) {
      continue;
    }

    const vectorOriginFramePx = new Vector2(centroid[0], centroid[1]);
    const vectorComponents = new Vector2(delta[0], delta[1]);
    drawVector(ctx, params, origin, vectorOriginFramePx, vectorComponents);
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
      renderVectorField(ctx, params, style, origin);
    },
  };
}
