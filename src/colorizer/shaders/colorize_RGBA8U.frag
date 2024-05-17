precision highp usampler2D;

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

uniform vec2 canvasToFrameScale;
uniform vec2 canvasCenterCoords;
uniform sampler2D colorRamp;
uniform sampler2D overlay;
uniform sampler2D backdrop;
uniform float backdropSaturation;
uniform float backdropBrightness;
uniform float objectOpacity;

uniform vec3 backgroundColor;
// Background color for the canvas, anywhere where the frame is not drawn.
uniform vec3 canvasBackgroundColor;

const vec4 TRANSPARENT = vec4(0.0, 0.0, 0.0, 0.0);

/** MUST be synchronized with the DrawMode enum in ColorizeCanvas! */
const uint DRAW_MODE_HIDE = 0u;
const uint DRAW_MODE_COLOR = 1u;

uniform vec3 outlierColor;
uniform uint outlierDrawMode;
uniform vec3 outOfRangeColor;
uniform uint outOfRangeDrawMode;

uniform int highlightedId;

uniform bool hideOutOfRange;

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

vec4 getColorRamp(float val) {
  float width = float(textureSize(colorRamp, 0).x);
  float range = (width - 1.0) / width;
  float adjustedVal = (0.5 / width) + (val * range);
  return texture(colorRamp, vec2(adjustedVal, 0.5));
}

bool isEdge(vec2 uv, ivec2 frameDims) {
  float thickness = 2.0;
  float wStep = 1.0 / float(frameDims.x);
  float hStep = 1.0 / float(frameDims.y);        
  // sample around the pixel to see if we are on an edge
  // TODO: Fix this so it samples using canvas pixel offsets instead of frame pixel offsets.
  // Currently, the edge detection is sparser when loading high-resolution frames.
  int R = int(combineColor(texture(frame, uv + vec2(thickness * wStep, 0)))) - 1;
  int L = int(combineColor(texture(frame, uv + vec2(-thickness * wStep, 0)))) - 1;
  int T = int(combineColor(texture(frame, uv + vec2(0, thickness * hStep)))) - 1;
  int B = int(combineColor(texture(frame, uv + vec2(0, -thickness * hStep)))) - 1;
  // if any neighbors are not highlightedId then color this as edge
  return (R != highlightedId || L != highlightedId || T != highlightedId || B != highlightedId);
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

vec4 getObjectColor(vec2 sUv) {
  // This pixel is background if, after scaling uv, it is outside the frame
  if (isOutsideBounds(sUv)) {
    return vec4(canvasBackgroundColor, 1.0);
  }

  // Get the segmentation id at this pixel
  uint id = combineColor(texture(frame, sUv));

  // A segmentation id of 0 represents background
  if (id == 0u) {
    return TRANSPARENT;
  }

  // do an outline around highlighted object
  ivec2 frameDims = textureSize(frame, 0);
  if (int(id) - 1 == highlightedId) {
    if (isEdge(sUv, frameDims)) {
      return vec4(1.0, 0.0, 1.0, 1.0);
    }
  }

  // Data buffer starts at 0, non-background segmentation IDs start at 1
  float featureVal = getFloatFromTex(featureData, int(id) - 1).r;
  uint outlierVal = getUintFromTex(outlierData, int(id) - 1).r;
  float normFeatureVal = (featureVal - featureColorRampMin) / (featureColorRampMax - featureColorRampMin);

  // Use the selected draw mode to handle out of range and outlier values;
  // otherwise color with the color ramp as usual.
  bool isInRange = getUintFromTex(inRangeIds, int(id) - 1).r == 1u;
  bool isOutlier = isinf(featureVal) || outlierVal != 0u;

  // Features outside the filtered/thresholded range will all be treated the same (use `outOfRangeDrawColor`).
  // Features inside the range can either be outliers or standard values, and are colored accordingly.
  if (isInRange) {
    if (isOutlier) {
      return getColorFromDrawMode(outlierDrawMode, outlierColor);
    } else {
      return getColorRamp(normFeatureVal);
    }
  } else {
    return getColorFromDrawMode(outOfRangeDrawMode, outOfRangeColor);
  }
}

void main() {
  vec2 sUv = (vUv - 0.5) * canvasToFrameScale + 0.5 - canvasCenterCoords;

  // Backdrop image
  vec4 backdropColor = getBackdropColor(sUv);

  // Segmentation colors
  vec4 mainColor = getObjectColor(sUv);
  mainColor.a *= objectOpacity;

  // Overlays for timestamp/scale bar
  vec4 overlayColor = texture(overlay, vUv).rgba;  // Unscaled UVs, because it is sized to the canvas

  gOutputColor = vec4(backgroundColor, 1.0);
  gOutputColor = alphaBlend(backdropColor, gOutputColor);
  gOutputColor = alphaBlend(mainColor, gOutputColor);
  gOutputColor = alphaBlend(overlayColor, gOutputColor);
}
