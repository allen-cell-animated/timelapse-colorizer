import { Vector2 } from "three";

import {
  BaseRenderParams,
  ContainerStyle,
  defaultContainerStyle,
  defaultFontStyle,
  EMPTY_RENDER_INFO,
  FontStyle,
  RenderInfo,
} from "../types";
import { configureCanvasText, renderCanvasText } from "../utils";

export type HeaderStyle = ContainerStyle & FontStyle;
export type HeaderParams = BaseRenderParams & {
  visible: boolean;
};

export const defaultHeaderStyle: HeaderStyle = {
  ...defaultFontStyle,
  ...defaultContainerStyle,
  paddingPx: new Vector2(10, 10),
};

/**
 * Gets the display name of the dataset and/or collection.
 * @returns String or undefined:
 * - `{Collection} - {Dataset}` if a collection name is present.
 * - `{Dataset}` if no collection name is present.
 * - `undefined` if no dataset or collection is currently set.
 */
function getHeaderText(params: HeaderParams): string | undefined {
  if (!params.dataset || !params.collection || !params.datasetKey) {
    return undefined;
  }
  const datasetName = params.collection.getDatasetName(params.datasetKey);
  if (params.collection.metadata.name) {
    return `${params.collection.metadata.name} - ${datasetName}`;
  }
  return datasetName;
}

/**
 * Renders the header text if visible and there is a valid dataset name (and optional collection name)
 * to display. The header is rendered as a filled and outlined box around the text, set to the width
 * of the canvas.
 *
 * @returns a RenderInfo object containing the size of the header and render
 * callback for the header. The size will be (0, 0) if the header is not visible.
 */
export function getHeaderRenderer(ctx: CanvasRenderingContext2D, params: HeaderParams, style: HeaderStyle): RenderInfo {
  const headerText = getHeaderText(params);
  if (!headerText || !params.visible) {
    return EMPTY_RENDER_INFO;
  }

  const height = style.fontSizePx + style.paddingPx.y * 2;
  const width = ctx.canvas.width;
  return {
    sizePx: new Vector2(width, height),
    render: (origin = new Vector2(0, 0)) => {
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.fillRect(origin.x - 0.5, origin.y - 0.5, params.canvasWidth + 1, height);
      ctx.strokeRect(origin.x - 0.5, origin.y - 0.5, params.canvasWidth + 1, height);

      const textOrigin = origin.clone().add(new Vector2(params.canvasWidth / 2, style.paddingPx.y));
      const fontOptions = { maxWidth: params.canvasWidth - style.paddingPx.x * 2, ...style };
      configureCanvasText(ctx, style, "center", "top");
      renderCanvasText(ctx, textOrigin.x, textOrigin.y, headerText, fontOptions);
    },
  };
}
