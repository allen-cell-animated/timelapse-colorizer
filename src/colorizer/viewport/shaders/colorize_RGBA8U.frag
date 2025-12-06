precision highp usampler2D;
precision highp int;

uniform usampler2D frame;
uniform sampler2D featureData;
uniform usampler2D outlierData;
/** A mapping of IDs that are in range after feature thresholding/filtering is applied. If
 * an object's index is `i`, `inRangeIds[i] = 1` if the object
 * is within the threshold range. Note that data is packed into a square texture.
 */
uniform usampler2D inRangeIds;
/** Min and max feature values that define the endpoints of the color map. Values
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
const int NO_HIGHLIGHT_ID = -1;
const float OUTLINE_WIDTH_PX = 2.0;
const float EDGE_WIDTH_PX = 1.0;

uniform vec3 outlierColor;
uniform uint outlierDrawMode;
uniform vec3 outOfRangeColor;
uniform uint outOfRangeDrawMode;

uniform int highlightedId;

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

// Combine non-alpha color channels into one 24-bit value
uint combineColor(uvec4 color) {
  return (color.b << 16u) | (color.g << 8u) | color.r;
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
int getGlobalId(vec2 sUv, out uint labelId) {
  labelId = combineColor(texture(frame, sUv));
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

/**
 * Returns true if the pixel at the given coordinates is at the edge of an object.
 * @param uv The scaled UV coordinates to check.
 * @param labelId The label ID of the pixel at `uv` (i.e., the pixel value in the
 *     segmentation image).
 * @param thicknessPx The thickness in screen pixels to use when checking for edges.
 * @returns True if the pixel is at the edge of an object.
 */
bool isEdge(vec2 uv, uint labelId, float thicknessPx) {
  // step size is equal to thicknessPx onscreen canvas pixels.
  float wStep = thicknessPx / float(canvasSizePx.x) * float(canvasToFrameScale.x);
  float hStep = thicknessPx / float(canvasSizePx.y) * float(canvasToFrameScale.y);        

  // Sample around the pixel to see if we are on an edge.
  // Compare using label IDs (pixels in the segmentation image) because global IDs may be missing
  // for some objects.
  uint rLabelId;
  uint lLabelId;
  uint tLabelId;
  uint bLabelId;
  getGlobalId(uv + vec2(wStep, 0), rLabelId);
  getGlobalId(uv + vec2(-wStep, 0), lLabelId);
  getGlobalId(uv + vec2(0, hStep), tLabelId);
  getGlobalId(uv + vec2(0, -hStep), bLabelId);
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
    return TRANSPARENT;
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

vec4 getObjectColor(vec2 sUv, float opacity) {
  // This pixel is background if, after scaling uv, it is outside the frame
  if (isOutsideBounds(sUv)) {
    return vec4(canvasBackgroundColor, 1.0);
  }

  // Get the segmentation id at this pixel
  uint labelId;
  int id = getGlobalId(sUv, labelId);

  // A label id of 0 represents background
  if (labelId == RAW_BACKGROUND_ID) {
    return TRANSPARENT;
  }

  // do an outline around highlighted object
  if (highlightedId != NO_HIGHLIGHT_ID && id == highlightedId) {
    if (isEdge(sUv, labelId, OUTLINE_WIDTH_PX)) {
      // ignore opacity for edge color
      return vec4(outlineColor, 1.0);
    }
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
  bool isEdgePixel = (edgeColorAlpha != 0.0) && (isEdge(sUv, labelId, EDGE_WIDTH_PX));

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
  float baseAlpha = color.a;
  color.a *= opacity;
  if (baseAlpha != 0.0 && isEdgePixel) {
    vec4 transparentEdgeColor = vec4(edgeColor, edgeColorAlpha);
    color = alphaBlend(transparentEdgeColor, color);
  }
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

  gOutputColor = vec4(backgroundColor, 1.0);
  gOutputColor = alphaBlend(backdropColor, gOutputColor);
  gOutputColor = alphaBlend(mainColor, gOutputColor);
  gOutputColor = alphaBlend(overlayColor, gOutputColor);
}
