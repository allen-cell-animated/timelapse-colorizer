import { Vector2 } from "three";

import { EMPTY_RENDER_INFO, RenderInfo } from "../types";

export type InsetBoxStyle = {
  fill: string;
  stroke: string;
  paddingPx: Vector2;
  marginPx: Vector2;
  radiusPx: number;
  gap: number;
};

export const defaultInsetBoxStyle: InsetBoxStyle = {
  fill: "rgba(255, 255, 255, 0.8)",
  stroke: "rgba(0, 0, 0, 0.2)",
  paddingPx: new Vector2(10, 10),
  marginPx: new Vector2(12, 12),
  radiusPx: 4,
  gap: 2,
};

/**
 * Draws the inset box's background, intended to be layered under the inner
 * content elements.
 * @param ctx Canvas context to render to.
 * @param origin The top left corner of the box, in pixels.
 * @param size Size of the inset, in pixels.
 * @param style Style config for the inset.
 */
function renderInsetBoxBackground(
  ctx: CanvasRenderingContext2D,
  origin: Vector2,
  size: Vector2,
  style: InsetBoxStyle
): void {
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.beginPath();
  ctx.roundRect(
    Math.round(origin.x) + 0.5,
    Math.round(origin.y) + 0.5,
    Math.round(size.x),
    Math.round(size.y),
    style.radiusPx
  );
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

/**
 * Renders one or more elements stacked vertically inside an inset box. Contents are
 * rendered in order from top to bottom and aligned to the right.
 *
 * If all elements have size zero, the inset box will not be rendered.
 *
 * @param ctx Rendering context to render to.
 * @param contents The RenderInfo of the elements to render inside the inset box, in order from
 *   top to bottom.
 * @param style Styling configuration for the inset box.
 * @param contents: Array of elements to render inside the inset box.
 * @returns RenderInfo object containing the size of the inset box and render callback to render
 * it and its contents. The size will be (0, 0) if the inset box is not visible.
 */
export function getInsetBoxRenderer(
  ctx: CanvasRenderingContext2D,
  contents: RenderInfo[],
  style: InsetBoxStyle
): RenderInfo {
  const contentSize = new Vector2(0, 0);
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    contentSize.x = Math.max(contentSize.x, content.sizePx.x);
    contentSize.y += content.sizePx.y;

    if (i > 0 && content.sizePx.y > 0) {
      contentSize.y += style.gap;
    }
  }

  // If all contents are invisible, don't render the inset box
  if (contentSize.equals(new Vector2(0, 0))) {
    return EMPTY_RENDER_INFO;
  }

  const boxSize = contentSize.clone().add(style.paddingPx.clone().multiplyScalar(2.0));

  return {
    sizePx: boxSize,
    render: (origin: Vector2) => {
      renderInsetBoxBackground(ctx, origin, boxSize, style);

      // Render all the contents in order from top to bottom.
      // Contents should be rendered with a gap and aligned to the right.
      const contentOrigin = origin.clone().add(style.paddingPx);
      for (let i = 0; i < contents.length; i++) {
        const content = contents[i];
        const offsetOrigin = contentOrigin.clone();
        offsetOrigin.x += contentSize.x - content.sizePx.x;

        content.render(offsetOrigin);

        if (content.sizePx.y > 0) {
          contentOrigin.y += style.gap;
        }
        contentOrigin.y += content.sizePx.y;
      }
    },
  };
}
