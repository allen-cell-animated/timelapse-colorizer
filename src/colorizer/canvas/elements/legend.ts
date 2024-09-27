import { Color, Vector2 } from "three";

import { numberToStringDecimal } from "../../utils/math_utils";
import { BaseRenderParams, defaultFontStyle, EMPTY_RENDER_INFO, FontStyle, RenderInfo } from "../types";
import { configureCanvasText, renderCanvasText } from "../utils";

import ColorRamp from "../../ColorRamp";

const MAX_CATEGORIES_PER_COLUMN = 4;

export type LegendStyle = FontStyle & {
  stroke: string;
  labelFontSizePx: number;
  labelFontColor: string;

  rampHeightPx: number;
  rampPaddingPx: number;
  rampRadiusPx: number;
  maxColorRampWidthPx: number;

  categoryPaddingPx: Vector2;
  categoryLabelGapPx: number;
  categoryColGapPx: number;
  maxCategoricalWidthPx: number;
};

export const defaultLegendStyle: LegendStyle = {
  ...defaultFontStyle,
  stroke: "rgba(203, 203, 204, 1.0)",
  labelFontSizePx: 12,
  labelFontColor: "black",

  categoryPaddingPx: new Vector2(2, 2),
  categoryLabelGapPx: 6,
  categoryColGapPx: 32,
  maxCategoricalWidthPx: 800,

  maxColorRampWidthPx: 300,
  rampPaddingPx: 4,
  rampHeightPx: 28,
  rampRadiusPx: 4,
};

export type LegendParams = BaseRenderParams & {
  colorRamp: ColorRamp;
  categoricalPalette: ColorRamp;
  colorMapRangeMin: number;
  colorMapRangeMax: number;
};

function getSelectedFeatureName(params: LegendParams): string | undefined {
  if (!params.dataset || !params.featureKey) {
    return undefined;
  }
  return params.dataset.getFeatureNameWithUnits(params.featureKey);
}

function getCategoricalKeyRenderer(
  ctx: CanvasRenderingContext2D,
  params: LegendParams,
  style: LegendStyle
): RenderInfo {
  const maxWidthPx = style.maxCategoricalWidthPx;
  if (!params.dataset || !params.featureKey) {
    return EMPTY_RENDER_INFO;
  }

  const featureData = params.dataset.getFeatureData(params.featureKey);
  const featureName = getSelectedFeatureName(params);
  if (!featureData || !featureData.categories || !featureName) {
    return EMPTY_RENDER_INFO;
  }

  // Render feature label
  const featureLabelHeightPx = style.fontSizePx + 6;
  const categoryHeightPx = style.labelFontSizePx + style.categoryPaddingPx.y * 2;
  const maxColumnHeight = Math.min(featureData.categories.length, MAX_CATEGORIES_PER_COLUMN) * categoryHeightPx;
  const heightPx = featureLabelHeightPx + maxColumnHeight;

  return {
    sizePx: new Vector2(maxWidthPx, heightPx),
    render: (origin: Vector2) => {
      // Render feature label
      const featureLabelFontStyle: FontStyle = { ...style };
      configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
      renderCanvasText(ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
      const labelHeight = featureLabelFontStyle.fontSizePx + 6; // Padding
      origin.y += labelHeight; // Padding

      // Render categories
      const categories = featureData.categories || [];
      const numColumns = Math.ceil(categories.length / MAX_CATEGORIES_PER_COLUMN);
      const categoryWidth = Math.floor(maxWidthPx / numColumns - style.categoryColGapPx);
      const categoryHeight = style.labelFontSizePx + style.categoryPaddingPx.y * 2;
      const colOrigin = origin.clone();

      for (let colIndex = 0; colIndex < numColumns; colIndex++) {
        // Calculate starting point for the column
        const currCategoryOrigin = colOrigin.clone();

        let maxCategoryWidth = Number.NEGATIVE_INFINITY;
        for (
          let categoryIndex = colIndex * MAX_CATEGORIES_PER_COLUMN;
          categoryIndex < Math.min((colIndex + 1) * MAX_CATEGORIES_PER_COLUMN, categories.length);
          categoryIndex++
        ) {
          const category = categories[categoryIndex];
          currCategoryOrigin.round();

          // Color label
          const color = new Color(params.categoricalPalette.colorStops[categoryIndex]);
          ctx.fillStyle = color.getStyle();
          ctx.beginPath();
          ctx.roundRect(
            currCategoryOrigin.x,
            currCategoryOrigin.y,
            Math.round(style.labelFontSizePx),
            Math.round(style.labelFontSizePx),
            2
          );
          ctx.closePath();
          ctx.fill();

          // Category label
          configureCanvasText(ctx, style, "left", "top");
          const maxTextWidth = categoryWidth - style.labelFontSizePx - style.categoryLabelGapPx;
          const textX = currCategoryOrigin.x + style.labelFontSizePx + style.categoryLabelGapPx;
          const textY = currCategoryOrigin.y - 1; // Fudge slightly to align with color label
          const textSize = renderCanvasText(ctx, textX, textY, category, {
            maxWidth: maxTextWidth,
          });
          maxCategoryWidth = Math.max(maxCategoryWidth, style.labelFontSizePx + style.categoryLabelGapPx + textSize.x);
          currCategoryOrigin.y += categoryHeight;
        }

        colOrigin.x += maxCategoryWidth + style.categoryColGapPx;
      }
    },
  };
}

function getNumericKeyRenderer(ctx: CanvasRenderingContext2D, params: LegendParams, style: LegendStyle): RenderInfo {
  const featureName = getSelectedFeatureName(params);
  if (!featureName) {
    return EMPTY_RENDER_INFO;
  }
  const maxWidthPx = style.maxColorRampWidthPx;
  const featureLabelFontStyle: FontStyle = { ...style };

  const height = style.fontSizePx + style.rampPaddingPx * 2 + style.rampHeightPx + style.labelFontSizePx;

  return {
    sizePx: new Vector2(maxWidthPx, height),
    render: (origin: Vector2) => {
      configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
      renderCanvasText(ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
      origin.y += featureLabelFontStyle.fontSizePx + style.rampPaddingPx;

      // Render color ramp gradient
      const colorStops = params.colorRamp.colorStops.map((c) => new Color(c));
      const gradient = ColorRamp.linearGradientFromColors(ctx, colorStops, maxWidthPx, 0, origin.x, origin.y);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = style.stroke;
      ctx.beginPath();
      ctx.roundRect(origin.x + 0.5, origin.y + 0.5, maxWidthPx - 2, style.rampHeightPx, style.rampRadiusPx);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      origin.y += style.rampHeightPx + style.rampPaddingPx;

      // Render min/max labels under color ramp
      const rangeLabelFontStyle: FontStyle = { ...style, fontSizePx: style.labelFontSizePx };
      const minLabel = numberToStringDecimal(params.colorMapRangeMin, 3, true);
      const maxLabel = numberToStringDecimal(params.colorMapRangeMax, 3, true);
      configureCanvasText(ctx, rangeLabelFontStyle, "left", "top");
      renderCanvasText(ctx, origin.x, origin.y, minLabel, { maxWidth: maxWidthPx / 2 });
      configureCanvasText(ctx, rangeLabelFontStyle, "right", "top");
      renderCanvasText(ctx, origin.x + maxWidthPx, origin.y, maxLabel, { maxWidth: maxWidthPx / 2 });
    },
  };
}

export function getLegendRenderer(ctx: CanvasRenderingContext2D, params: LegendParams, style: LegendStyle): RenderInfo {
  if (params.dataset && params.featureKey) {
    if (params.dataset.isFeatureCategorical(params.featureKey)) {
      return getCategoricalKeyRenderer(ctx, params, style);
    } else {
      return getNumericKeyRenderer(ctx, params, style);
    }
  }
  return EMPTY_RENDER_INFO;
}
