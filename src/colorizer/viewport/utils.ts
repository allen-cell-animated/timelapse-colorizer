import { Vector2 } from "three";

import { type Canvas2DScaleInfo, CanvasType } from "src/colorizer/types";

export function get2DCanvasScaling(
  frameResolution: Vector2,
  canvasResolution: Vector2,
  zoomMultiplier: number,
  offset: Vector2
): Canvas2DScaleInfo {
  // Both the frame and the canvas have coordinates in a range of [0, 1] in the
  // x and y axis. However, the canvas may have a different aspect ratio than
  // the frame, so we need to scale the frame to fit within the canvas while
  // maintaining the aspect ratio.
  const canvasAspect = canvasResolution.x / canvasResolution.y;
  const frameAspect = frameResolution.x / frameResolution.y;
  const unscaledFrameSizeInCanvasCoords: Vector2 = new Vector2(1, 1);
  if (canvasAspect > frameAspect) {
    // Canvas has a wider aspect ratio than the frame, so proportional height is
    // 1 and we scale width accordingly.
    unscaledFrameSizeInCanvasCoords.x = canvasAspect / frameAspect;
  } else {
    unscaledFrameSizeInCanvasCoords.y = frameAspect / canvasAspect;
  }

  // Get final size by applying the current zoom level, where `zoomMultiplier=2`
  // means the frame is 2x larger than its base size. Save this to use when
  // calculating onscreen units (e.g. with the scale bar).
  const frameSizeInCanvasCoordinates = unscaledFrameSizeInCanvasCoords.clone().multiplyScalar(zoomMultiplier);
  // Transforms from [0, 1] space of the canvas to the [0, 1] space of the frame
  // by dividing by the zoom level.
  // ex: Let's say our frame has the same aspect ratio as the canvas, but our
  // zoom is set to 2x. Assuming that the [0, 0] position of the frame and the
  // canvas are in the same position, the position [1, 1] on the canvas should
  // map to [0.5, 0.5] on the frame.
  const canvasToFrameCoordinates = unscaledFrameSizeInCanvasCoords.clone().divideScalar(zoomMultiplier);

  // Invert to get the frame to canvas coordinates. Useful for objects (e.g.
  // line mesh vertices) that are in frame coordinates and need to be drawn on
  // the canvas.
  const frameToCanvasCoordinates = new Vector2(1 / canvasToFrameCoordinates.x, 1 / canvasToFrameCoordinates.y);

  return {
    type: CanvasType.CANVAS_2D,
    frameSizeInCanvasCoordinates,
    canvasToFrameCoordinates,
    frameToCanvasCoordinates,
    panOffset: offset,
  };
}
