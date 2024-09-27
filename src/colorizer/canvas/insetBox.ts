import { Vector2 } from "three";

import { EMPTY_RENDER_INFO, RenderInfo } from "./types";

export type InsetBoxOptions = {
  fill: string;
  stroke: string;
  paddingPx: Vector2;
  marginPx: Vector2;
  radiusPx: number;
  gap: number;
};

export const defaultInsetBoxOptions: InsetBoxOptions = {
  fill: "rgba(255, 255, 255, 0.8)",
  stroke: "rgba(0, 0, 0, 0.2)",
  paddingPx: new Vector2(10, 10),
  marginPx: new Vector2(12, 12),
  radiusPx: 4,
  gap: 2,
};

/**
 * Draws the inset box's background, intended to be layered under the content elements.
 * @param ctx Canvas context to render to.
 * @param size Size of the inset, in pixels.
 * @param options Configuration for the inset.
 */
function renderInsetBoxBackground(
  ctx: CanvasRenderingContext2D,
  origin: Vector2,
  size: Vector2,
  options: InsetBoxOptions
): void {
  ctx.fillStyle = options.fill;
  ctx.strokeStyle = options.stroke;
  ctx.beginPath();
  ctx.roundRect(
    Math.round(origin.x) + 0.5,
    Math.round(origin.y) + 0.5,
    Math.round(size.x),
    Math.round(size.y),
    options.radiusPx
  );
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

/**
 * Renders one or more elements stacked vertically inside an inset box, aligned to the right.
 * Contents are rendered in order from top to bottom.
 *
 * If all elements have size zero, the inset box will return an empty RenderInfo.
 *
 * @param ctx Rendering context.
 * @param contents The RenderInfo of the elements to render inside the inset box.
 * @param options Styling configuration for the inset box.
 * @param contents: Array of elements to render inside the inset box.
 * @returns RenderInfo object containing the size of the inset box and render callback to render
 * it and its contents. The size will be (0, 0) if the inset box is not visible.
 */
export function getInsetBoxRenderer(
  ctx: CanvasRenderingContext2D,
  contents: RenderInfo[],
  options: InsetBoxOptions
): RenderInfo {
  let contentSize = new Vector2(0, 0);
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    contentSize.x = Math.max(contentSize.x, content.sizePx.x);
    contentSize.y += content.sizePx.y;

    if (i > 0 && content.sizePx.y > 0) {
      contentSize.y += options.gap;
    }
  }

  // If all contents are invisible, don't render the inset box
  if (contentSize.equals(new Vector2(0, 0))) {
    return EMPTY_RENDER_INFO;
  }

  const boxSize = contentSize.clone().add(options.paddingPx.clone().multiplyScalar(2.0));

  return {
    sizePx: boxSize,
    render: (origin: Vector2) => {
      renderInsetBoxBackground(ctx, origin, boxSize, options);

      // Render all the contents in order from top to bottom.
      // Contents should be rendered with a gap and aligned to the right.
      const contentOrigin = origin.clone().add(options.paddingPx);
      for (let i = 0; i < contents.length; i++) {
        const content = contents[i];
        const offsetOrigin = contentOrigin.clone();

        offsetOrigin.x += contentSize.x - content.sizePx.x;
        content.render(offsetOrigin);

        if (content.sizePx.y > 0) {
          contentOrigin.y += options.gap;
        }
      }
    },
  };
}
