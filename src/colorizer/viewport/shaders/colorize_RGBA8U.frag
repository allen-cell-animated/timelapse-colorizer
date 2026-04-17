precision highp usampler2D;
precision highp int;

uniform usampler2D frame;
uniform usampler2D framePoints;
uniform sampler2D featureData;
uniform usampler2D outlierData;
/** A mapping of IDs that are in range after feature thresholding/filtering is applied. If
 * an object's index is `i`, `inRangeIds[i] = 1` if the object
 * is within the threshold range. Note that data is packed into a square texture.
 */
uniform usampler2D inRangeIds;
/** 
 * A mapping of IDs that are selected in the current track(s). If an object's
 * index is `i`, `selectedIds[i] >= 1` if the object is selected.
 *
 * For selected objects, `selectedIds[i] - 1` is the index into the
 * `selectedTracksPalette` for the outline color that should be used when
 * `useTracksPalette` is true.
 */
uniform usampler2D selectedIds;
/**
 * If true, uses the `selectedTracksPalette` to outline selected tracks, and
 * shows an additional inner outline. When false, uses `outlineColor` for
 * outlines.
 */
uniform bool useTracksPalette;
uniform sampler2D selectedTracksPalette;
/** 
 * Min and max feature values that define the endpoints of the color map. Values
 * outside the range will be clamped to the nearest endpoint.
 */
uniform float featureColorRampMin;
uniform float featureColorRampMax;

/**
 * LUT mapping from the segmentation ID (raw pixel value) to the
 * global ID (index in data buffers like `featureData` and `outlierData`).
 * 
 * For a given segmentation ID `segId`, the global ID is given by:
 * `segIdToGlobalId[segId - segIdOffset] - 1`.
 */
uniform usampler2D segIdToGlobalId;
uniform uint segIdOffset;

uniform vec2 canvasToFrameScale;
uniform vec2 canvasSizePx;
uniform vec2 panOffset;
uniform sampler2D colorRamp;
uniform sampler2D overlay;
uniform sampler2D backdrop;
uniform float backdropSaturation;
uniform float backdropBrightness;
uniform float objectOpacity;

uniform vec3 backgroundColor;
uniform vec3 outlineColor;
uniform vec3 edgeColor;
uniform float edgeColorAlpha;
// Background color for the canvas, anywhere where the frame is not drawn.
uniform vec3 canvasBackgroundColor;

const vec4 TRANSPARENT = vec4(0.0, 0.0, 0.0, 0.0);

/** MUST be synchronized with the DrawMode enum in ColorizeCanvas! */
const uint DRAW_MODE_HIDE = 0u;
const uint DRAW_MODE_COLOR = 1u;
const uint RAW_BACKGROUND_ID = 0u;
const int MISSING_DATA_ID = -1;
const int ID_OFFSET = 1;
const float OUTLINE_WIDTH_PX = 2.0;
const float EDGE_WIDTH_PX = 1.0;

uniform vec3 outlierColor;
uniform uint outlierDrawMode;
uniform vec3 outOfRangeColor;
uniform uint outOfRangeDrawMode;

uniform bool useRepeatingCategoricalColors;

in vec2 vUv;

layout (location = 0) out vec4 gOutputColor;

// Adapted from https://www.shadertoy.com/view/XljGzV by anastadunbar
vec3 hsvToRgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Adapted from https://www.shadertoy.com/view/XljGzV by anastadunbar
vec3 rgbToHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

uvec4 getUintFromTex(usampler2D tex, int index) {
  int width = textureSize(tex, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(tex, featurePos, 0);
}

vec4 getFloatFromTex(sampler2D tex, int index) {
  int width = textureSize(tex, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(tex, featurePos, 0);
}

/**
 * Attempts to look up the global ID of the pixel at the given scaled UV
 * coordinates. The global ID can be used to get data about this object from
 * data buffers like `featureData` and `outlierData`.
 * @param sUv The scaled UV coordinates to look up.
 * @param labelId Output parameter that will contain the label ID, the pixel
 *     value in the segmentation image. 0 indicates the background.
 * @returns The global ID at the given coordinates, or -1 (=MISSING_DATA_ID) if
 *     the pixel is background or missing data.
 */
int getGlobalId(uint labelId) {
  if (labelId == 0u) {
    return MISSING_DATA_ID;
  }
  uvec4 c = getUintFromTex(segIdToGlobalId, int(labelId - segIdOffset));
  // Note: IDs are offset in `segIdToGlobalId` by `ID_OFFSET=1` to reserve `0`
  // for segmentations that are missing / have no corresponding global ID data.
  // `ID_OFFSET` is subtracted here to get the correct ID for accessing data
  // buffers.
  uint globalId = c.r; // 0 if missing data
  return int(globalId) - ID_OFFSET;
}

/**
 * Gets the label ID (aka raw pixel value) of the pixel at the given UV
 * coordinates.
 */
uint getLabelId(usampler2D tex, vec2 sUv, out float alpha) {
  uvec4 color = texture(tex, sUv);
  alpha = float(color.a) / 255.0;
  uint colorInt = (color.b << 16u) | (color.g << 8u) | color.r;
  return colorInt;
}

vec4 getColorRamp(float val) {
  float width = float(textureSize(colorRamp, 0).x);
  float range = (width - 1.0) / width;
  float adjustedVal = (0.5 / width) + (val * range);
  return texture(colorRamp, vec2(adjustedVal, 0.5));
}

vec4 getCategoricalColor(float featureValue) {
  float width = float(textureSize(colorRamp, 0).x);
  float modValue = mod(featureValue, width);
  // The categorical texture uses no interpolation, so when sampling, `modValue`
  // is rounded to the nearest integer.
  return getColorRamp(modValue / (width - 1.0));
}

vec4 getOutlineColor(int colorIdx) {
  if (!useTracksPalette) {
    return vec4(outlineColor, 1);
  }
  float width = float(textureSize(selectedTracksPalette, 0).x);
  float adjustedIdx = (0.5 + float(colorIdx)) / width;
  return texture(selectedTracksPalette, vec2(adjustedIdx, 0.5));
}

/**
 * Returns true if the pixel at the given coordinates is at the edge of an object.
 * @param uv The scaled UV coordinates to check.
 * @param labelId The label ID of the pixel at `uv` (i.e., the pixel value in the
 *     segmentation image).
 * @param thicknessPx The thickness in screen pixels to use when checking for edges.
 * @returns True if the pixel is at the edge of an object.
 */
bool isEdge(usampler2D tex, vec2 uv, uint labelId, float thicknessPx, bool useFrameScaling) {
  // step size is equal to thicknessPx onscreen canvas pixels.
  float wStep = thicknessPx / float(canvasSizePx.x);
  float hStep = thicknessPx / float(canvasSizePx.y);
  if (useFrameScaling) {
    wStep *= float(canvasToFrameScale.x);
    hStep *= float(canvasToFrameScale.y);
  }

  // Sample around the pixel to see if we are on an edge.
  // Compare using label IDs (pixels in the segmentation image) because global IDs may be missing
  // for some objects.
  float _alpha; // unused
  uint rLabelId = getLabelId(tex, uv + vec2(+wStep, 0), _alpha);
  uint lLabelId = getLabelId(tex, uv + vec2(-wStep, 0), _alpha);
  uint tLabelId = getLabelId(tex, uv + vec2(0, +hStep), _alpha);
  uint bLabelId = getLabelId(tex, uv + vec2(0, -hStep), _alpha);
  return rLabelId != labelId || lLabelId != labelId || tLabelId != labelId || bLabelId != labelId;
}

vec4 getColorFromDrawMode(uint drawMode, vec3 defaultColor) {
  if (drawMode == DRAW_MODE_HIDE) {
    return vec4(backgroundColor, 0.0);
  } else {
    return vec4(defaultColor, 1.0);
  }
}

vec4 alphaBlend(vec4 a, vec4 b) {
  // Implements a over b operation. See https://en.wikipedia.org/wiki/Alpha_compositing
  float alpha = a.a + b.a * (1.0 - a.a);
  return vec4((a.rgb * a.a + b.rgb * b.a * (1.0 - a.a)) / alpha, alpha);
}

bool isOutsideBounds(vec2 sUv) {
  return sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0;
}

vec4 getBackdropColor(vec2 sUv) {
  if (isOutsideBounds(sUv)) {
    return vec4(canvasBackgroundColor, 1.0);
  }
  vec4 backdropColor = texture(backdrop, sUv).rgba;
  vec3 backdropHsv = rgbToHsv(backdropColor.rgb);
  backdropHsv.y *= backdropSaturation;
  vec3 backdropRgb = hsvToRgb(backdropHsv);

  // Apply brightness adjustment
  float normalizedBrightness = backdropBrightness - 1.0;
  if (normalizedBrightness < 0.0) {
    // Decrease brightness
    backdropRgb *= (1.0 + normalizedBrightness);
  } else {
    // Increase brightness
    backdropRgb += (1.0 - backdropRgb) * normalizedBrightness;
  }

  return vec4(backdropRgb, backdropColor.a);
}

/**
 * Gets the base color of an object from its global ID. Applies the color map
 * and handling for out-of-range and outlier values.
 * 
 * Note that the output color's alpha will be 0 if the value is hidden by the
 * current draw mode.
 */
vec4 getFeatureColor(int id, vec2 uv) {
  if (id < 0) {
    return TRANSPARENT;
  }

  // Data buffer starts at 0, non-background segmentation IDs start at 1
  float featureVal = getFloatFromTex(featureData, id).r;
  uint outlierVal = getUintFromTex(outlierData, id).r;
  float normFeatureVal = (featureVal - featureColorRampMin) / (featureColorRampMax - featureColorRampMin);

  // Use the selected draw mode to handle out of range and outlier values;
  // otherwise color with the color ramp as usual.
  bool isMissingData = id == MISSING_DATA_ID;
  bool isInRange = getUintFromTex(inRangeIds, id).r == 1u;
  bool isOutlier = isinf(featureVal) || outlierVal != 0u;

  // Features outside the filtered/thresholded range will all be treated the same (use `outOfRangeDrawColor`).
  // Features inside the range can either be outliers or standard values, and are colored accordingly.
  vec4 color;
  if (isMissingData) {
    // TODO: Use a different color for missing data.
    color = getColorFromDrawMode(outlierDrawMode, outlierColor);
  } else if (isInRange) {
    if (isOutlier) {
      color = getColorFromDrawMode(outlierDrawMode, outlierColor);
    } else if (useRepeatingCategoricalColors) {
      color = getCategoricalColor(featureVal);
    } else {
      color = getColorRamp(normFeatureVal);
    }
  } else {
    color = getColorFromDrawMode(outOfRangeDrawMode, outOfRangeColor);
  }
  return color;
}

vec4 getObjectColor(vec2 sUv, float opacity) {
  if (isOutsideBounds(sUv)) {
    return TRANSPARENT;
  }

  // Get the segmentation id at this pixel
  float _labelAlpha = 1.0;
  uint labelId = getLabelId(frame, sUv, _labelAlpha);
  int id = getGlobalId(labelId);

  // A label id of 0 represents background
  if (labelId == RAW_BACKGROUND_ID) {
    return TRANSPARENT;
  }

  // Draw an outline around highlighted objects
  uint selectionIdx = getUintFromTex(selectedIds, id).r;
  if (selectionIdx > 0u) {
    if (isEdge(frame, sUv, labelId, OUTLINE_WIDTH_PX, true)) {
      int colorIdx = int(selectionIdx) - 1;
      vec4 color = getOutlineColor(colorIdx);
      return vec4(color.rgb, 1.0);
    } else if (isEdge(frame, sUv, labelId, OUTLINE_WIDTH_PX + 2.0, true) && useTracksPalette) {
      // When coloring with the track palette, apply an additional 2px inner
      // outline using the background color for better contrast against the
      // track outline color.
      return vec4(backgroundColor, 1.0);
    }
  }

  // Get base color and apply edge color if this is an edge pixel.
  vec4 baseColor = getFeatureColor(id, sUv);
  float baseAlpha = baseColor.a;
  baseColor.a *= opacity;

  // Apply edge color if this is a non-transparent edge pixel.
  bool isEdgePixel = (edgeColorAlpha != 0.0) && (isEdge(frame, sUv, labelId, EDGE_WIDTH_PX, true));
  if (baseAlpha != 0.0 && isEdgePixel) {
    vec4 transparentEdgeColor = vec4(edgeColor, edgeColorAlpha);
    baseColor = alphaBlend(transparentEdgeColor, baseColor);
  }
  return baseColor;
}

vec4 getPointColor(vec2 uv) {
  // Get the segmentation id at this pixel
  float labelAlpha = 1.0;
  uint labelId = getLabelId(framePoints, uv, labelAlpha);
  int id = getGlobalId(labelId);

  if (labelId == RAW_BACKGROUND_ID) {
    return TRANSPARENT;
  }

  vec4 baseColor = getFeatureColor(id, uv);
  if (baseColor.a == 0.0) {
    return TRANSPARENT;
  }

  // Points should render with a smooth, 1px anti-aliased outline, and we can
  // use some special alpha value tricks to do so.
  //
  // The alpha values of the points look something like this: ◎ 
  //
  // The point has an inner area where `labelAlpha=1`, and an outer ring that
  // transitions from 1.0 to 0.0 that is 2px wide. The inner area will be
  // colored with the full base color, and we want the 1px outline to be placed
  // in the middle of that transition zone (~0.5 labelAlpha).

  vec4 color = baseColor;
  // Multiply + clamp labelAlpha here so that color remains solid up until the
  // 1px outline, then transitions to 0. (e.g. `alpha=1` when `labelAlpha>=0.5`)
  float alpha = clamp((labelAlpha * 2.0), 0.0, 1.0);

  // Apply edge colors
  if (edgeColorAlpha > 0.0) {
    // - `t=0` when `labelAlpha=1` (e.g. show the base color)
    // - `0>t>1` when `labelAlpha<1` (e.g. transition to the edge color)
    // - `t=1` when `labelAlpha>=0.33` (e.g. show the edge color slightly
    //   earlier than the middle of the transition zone so it's more visible)
    float t = clamp((1.0 - labelAlpha) * 3.0, 0.0, 1.0);
    bool isEdgePixel = isEdge(framePoints, uv, labelId, EDGE_WIDTH_PX, false);
    if (isEdgePixel) {
      // Also apply edge color when this pixel is next to the point of a different
      // segmentation ID.
      t = max(t, 0.5);
    }
    vec4 outlineColor = alphaBlend(vec4(edgeColor, edgeColorAlpha), baseColor);
    color = mix(baseColor, outlineColor, t);
  }
  color.a *= alpha * objectOpacity;
  return color;
}

void main() {
  // sUv is in relative coordinates to frame.
  vec2 sUv = (vUv - 0.5) * canvasToFrameScale + 0.5 - panOffset;

  // Backdrop image
  vec4 backdropColor = getBackdropColor(sUv);

  // Segmentation colors
  vec4 mainColor = getObjectColor(sUv, objectOpacity);

  // Overlays for timestamp/scale bar
  vec4 overlayColor = texture(overlay, vUv).rgba;  // Unscaled UVs, because it is sized to the canvas

  vec4 pointTextureColor = getPointColor(vUv);

  gOutputColor = vec4(backgroundColor, 1.0);
  gOutputColor = alphaBlend(backdropColor, gOutputColor);
  gOutputColor = alphaBlend(mainColor, gOutputColor);
  gOutputColor = alphaBlend(pointTextureColor, gOutputColor);
  gOutputColor = alphaBlend(overlayColor, gOutputColor);
}
