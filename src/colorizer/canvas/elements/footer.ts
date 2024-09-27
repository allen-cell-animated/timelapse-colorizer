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
import { getInsetBoxRenderer, InsetBoxStyle } from "./insetBox";
import { getLegendRenderer, LegendParams, LegendStyle } from "./legend";
import { getScaleBarRenderer, ScaleBarParams, ScaleBarStyle } from "./scalebar";
import { getTimestampRenderer, TimestampParams, TimestampStyle } from "./timestamp";

export type FooterStyle = ContainerStyle &
  FontStyle & {
    heightPx: number;
  };

export type FooterParams = BaseRenderParams & {
  visible: boolean;

  timestamp: TimestampParams;
  timestampStyle: TimestampStyle;
  scalebar: ScaleBarParams;
  scalebarStyle: ScaleBarStyle;
  insetBoxStyle: InsetBoxStyle;
  legend: LegendParams;
  legendStyle: LegendStyle;
};

export const defaultFooterStyle: FooterStyle = {
  ...defaultFontStyle,
  ...defaultContainerStyle,
  heightPx: 100,
  paddingPx: new Vector2(10, 10),
};

/**
 * Returns the render information for the footer, which contains the legend and an inset box with
 * the timestamp and scale bar inside. If the footer is not visible, the inset box is rendered in
 * the bottom right corner of the viewport.
 * @param ctx Canvas rendering context to render to.
 * @param params Parameters and styling options for the timestamp, scalebar, legend, and inset box.
 * @param style Styling options for the footer.
 * @returns a RenderInfo object containing the size of the footer and render callback for the footer.
 * The origin should be the bottom left corner of the colorized viewport.
 */
export function getFooterRenderer(ctx: CanvasRenderingContext2D, params: FooterParams, style: FooterStyle): RenderInfo {
  const timestampInfo = getTimestampRenderer(ctx, params.timestamp, params.timestampStyle);
  const scaleBarInfo = getScaleBarRenderer(ctx, params.scalebar, params.scalebarStyle);
  const { sizePx: insetSize, render: renderInset } = getInsetBoxRenderer(
    ctx,
    [timestampInfo, scaleBarInfo],
    params.insetBoxStyle
  );

  if (!params.visible) {
    // If the footer is hidden, the inset box floats in the bottom right corner of the viewport.
    return {
      sizePx: new Vector2(0, 0),
      render: (origin = new Vector2(0, 0)) => {
        // Offset vertically by height + default margins
        origin.y -= insetSize.y + params.insetBoxStyle.marginPx.y;
        origin.x = params.canvasWidth - insetSize.x - params.insetBoxStyle.marginPx.x;
        renderInset(origin);
      },
    };
  }

  const insetMargin = insetSize.x > 0 ? params.insetBoxStyle.marginPx.x : 0;
  const availableContentWidth = params.canvasWidth - style.paddingPx.x * 2 - insetSize.x - insetMargin;
  // Size legend based on available content width
  const legendOptions = {
    ...params.legendStyle,
    maxCategoricalWidthPx: Math.min(availableContentWidth, params.legendStyle.maxCategoricalWidthPx),
    maxColorRampWidthPx: Math.min(availableContentWidth, params.legendStyle.maxColorRampWidthPx),
  };
  const { sizePx: legendSize, render: legendRenderer } = getLegendRenderer(ctx, params.legend, legendOptions);

  const maxHeight = Math.max(insetSize.y, legendSize.y);
  if (maxHeight === 0) {
    return EMPTY_RENDER_INFO;
  }
  const height = Math.round(maxHeight + style.paddingPx.y * 2);
  const width = Math.round(params.canvasWidth + 1);

  return {
    sizePx: new Vector2(width, height),
    render: (origin: Vector2) => {
      origin.x = Math.round(origin.x);
      origin.y = Math.round(origin.y) + 1;

      // Fill in the background of the footer
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.fillRect(origin.x - 0.5, origin.y - 0.5, width, height);
      ctx.strokeRect(origin.x - 0.5, origin.y - 0.5, width, height);

      // Render the inset box, centering it vertically
      const insetOrigin = new Vector2(
        params.canvasWidth - insetSize.x - style.paddingPx.x,
        origin.y + (height - insetSize.y) / 2
      );
      renderInset(insetOrigin);

      // Render the legend
      const legendOrigin = new Vector2(origin.x + style.paddingPx.x, origin.y + style.paddingPx.y);
      legendRenderer(legendOrigin);
    },
  };
}
