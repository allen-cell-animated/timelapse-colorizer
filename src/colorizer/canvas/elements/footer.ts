import { Vector2 } from "three";

import {
  BaseRenderParams,
  ContainerOptions,
  defaultContainerOptions,
  defaultStyleOptions,
  EMPTY_RENDER_INFO,
  FontStyleOptions,
  RenderInfo,
} from "../types";
import { getInsetBoxRenderer, InsetBoxOptions } from "./insetBox";
import { getLegendRenderer, LegendOptions, LegendParams } from "./legend";
import { getScaleBarRenderer, ScaleBarOptions, ScaleBarParams } from "./scalebar";
import { getTimestampRenderer, TimestampOptions, TimestampParams } from "./timestamp";

export type FooterOptions = ContainerOptions &
  FontStyleOptions & {
    heightPx: number;
  };

export type FooterParams = BaseRenderParams & {
  visible: boolean;

  timestamp: TimestampParams;
  timestampOptions: TimestampOptions;
  scalebar: ScaleBarParams;
  scalebarOptions: ScaleBarOptions;
  insetBoxOptions: InsetBoxOptions;
  legend: LegendParams;
  legendOptions: LegendOptions;
};

export const defaultFooterOptions: FooterOptions = {
  ...defaultStyleOptions,
  ...defaultContainerOptions,
  heightPx: 100,
  paddingPx: new Vector2(10, 10),
};

/**
 * Returns a RenderInfo object that renders the footer. Origin should be set from the top left corner
 * of the footer area.
 */
export function getFooterRenderer(
  ctx: CanvasRenderingContext2D,
  params: FooterParams,
  options: FooterOptions
): RenderInfo {
  const timestampInfo = getTimestampRenderer(ctx, params.timestamp, params.timestampOptions);
  const scaleBarInfo = getScaleBarRenderer(ctx, params.scalebar, params.scalebarOptions);
  const { sizePx: insetSize, render: renderInset } = getInsetBoxRenderer(
    ctx,
    [timestampInfo, scaleBarInfo],
    params.insetBoxOptions
  );

  if (!params.visible) {
    // If the footer is hidden, the inset box floats in the bottom right corner of the viewport.
    return {
      sizePx: new Vector2(0, 0),
      render: (origin = new Vector2(0, 0)) => {
        // Offset vertically by height + default margins
        origin.y -= insetSize.y + params.insetBoxOptions.marginPx.y;
        origin.x = params.canvasWidth - insetSize.x - params.insetBoxOptions.marginPx.x;
        renderInset(origin);
      },
    };
  }

  const insetMargin = insetSize.x > 0 ? params.insetBoxOptions.marginPx.x : 0;
  const availableContentWidth = params.canvasWidth - options.paddingPx.x * 2 - insetSize.x - insetMargin;
  // Size legend based on available content width
  const legendOptions = {
    ...params.legendOptions,
    maxCategoricalWidthPx: Math.min(availableContentWidth, params.legendOptions.maxCategoricalWidthPx),
    maxColorRampWidthPx: Math.min(availableContentWidth, params.legendOptions.maxColorRampWidthPx),
  };
  const { sizePx: legendSize, render: legendRenderer } = getLegendRenderer(ctx, params.legend, legendOptions);

  const maxHeight = Math.max(insetSize.y, legendSize.y);
  if (maxHeight === 0) {
    return EMPTY_RENDER_INFO;
  }
  const height = Math.round(maxHeight + options.paddingPx.y * 2);
  const width = Math.round(params.canvasWidth + 1);

  return {
    sizePx: new Vector2(width, height),
    render: (origin: Vector2) => {
      origin.x = Math.round(origin.x);
      origin.y = Math.round(origin.y) + 1;

      // Fill in the background of the footer
      ctx.fillStyle = options.fill;
      ctx.strokeStyle = options.stroke;
      ctx.fillRect(origin.x - 0.5, origin.y - 0.5, width, height);
      ctx.strokeRect(origin.x - 0.5, origin.y - 0.5, width, height);

      // Render the inset box, centering it vertically
      const insetOrigin = new Vector2(
        params.canvasWidth - insetSize.x - options.paddingPx.x,
        origin.y + (height - insetSize.y) / 2
      );
      renderInset(insetOrigin);

      // Render the legend
      const legendOrigin = new Vector2(origin.x + options.paddingPx.x, origin.y + options.paddingPx.y);
      legendRenderer(legendOrigin);
    },
  };
}
