import { Color, Vector2 } from "three";

import {
  type BaseRenderParams,
  defaultFontStyle,
  EMPTY_RENDER_INFO,
  type FontStyle,
  type RenderInfo,
} from "src/colorizer/canvas/types";
import { configureCanvasText, renderCanvasText } from "src/colorizer/canvas/utils";
import ColorRamp from "src/colorizer/ColorRamp";
import { formatNumber } from "src/colorizer/utils/math_utils";

const MAX_CATEGORIES_PER_COLUMN = 4;

export type LegendStyle = FontStyle & {
  stroke: string;
  labelFontSizePx: number;
  labelFontColor: string;

  rampHeightPx: number;
  rampPaddingPx: number;
  rampRadiusPx: number;
  maxColorRampWidthPx: number;

  categoryFeatureNameMarginPx: Vector2;
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
  categoryFeatureNameMarginPx: new Vector2(0, 6),
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

function renderCategory(
  ctx: CanvasRenderingContext2D,
  origin: Vector2,
  style: LegendStyle,
  color: Color,
  label: string,
  maxWidthPx: number
): Vector2 {
  origin = origin.clone();

  ctx.fillStyle = color.getStyle();
  ctx.beginPath();
  ctx.roundRect(origin.x, origin.y, Math.round(style.labelFontSizePx), Math.round(style.labelFontSizePx), 2);
  ctx.closePath();
  ctx.fill();

  const maxTextWidth = maxWidthPx - style.labelFontSizePx - style.categoryLabelGapPx;
  const textX = origin.x + style.labelFontSizePx + style.categoryLabelGapPx;
  const textY = origin.y - 1; // Fudge slightly to align with color label
  configureCanvasText(ctx, style, "left", "top");
  const textSize = renderCanvasText(ctx, textX, textY, label, {
    maxWidth: maxTextWidth,
  });

  return new Vector2(
    style.labelFontSizePx + style.categoryLabelGapPx + textSize.x,
    style.labelFontSizePx + style.categoryPaddingPx.y * 2
  );
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
      const labelHeight = featureLabelFontStyle.fontSizePx + style.categoryFeatureNameMarginPx.y;
      origin.y += labelHeight;

      // Render categories
      // Categories are displayed as a rounded rectangle containing the color, and the category label
      // in the smaller label font size. They are displayed in up to three columns, with a maximum of
      // 4 categories per column.
      const categories = featureData.categories || [];
      const numColumns = Math.ceil(categories.length / MAX_CATEGORIES_PER_COLUMN);
      const categoryWidth = Math.floor(maxWidthPx / numColumns - style.categoryColGapPx);
      const colOrigin = origin.clone();

      for (let colIndex = 0; colIndex < numColumns; colIndex++) {
        const currCategoryOrigin = colOrigin.clone();

        let maxCategoryWidth = Number.NEGATIVE_INFINITY;
        for (
          let categoryIndex = colIndex * MAX_CATEGORIES_PER_COLUMN;
          categoryIndex < Math.min((colIndex + 1) * MAX_CATEGORIES_PER_COLUMN, categories.length);
          categoryIndex++
        ) {
          const category = categories[categoryIndex];
          const color = new Color(params.categoricalPalette.colorStops[categoryIndex]);
          currCategoryOrigin.round();

          const renderedSize = renderCategory(ctx, currCategoryOrigin, style, color, category, categoryWidth);

          maxCategoryWidth = Math.max(maxCategoryWidth, renderedSize.x);
          currCategoryOrigin.y += renderedSize.y;
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
      // Render feature name
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
      const minLabel = formatNumber(params.colorMapRangeMin, 3);
      const maxLabel = formatNumber(params.colorMapRangeMax, 3);
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
