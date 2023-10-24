precision highp usampler2D;

uniform usampler2D frame;
uniform sampler2D featureData;
uniform usampler2D outlierData;
/** A mapping of IDs that are in range after feature thresholding is applied. If
 * an object's index is `i`, `inRangeIds[i] = 1` if the object
 * is within the threshold range. This does not account for thresholding
 * by the current featureMin or featureMax!
 */
uniform usampler2D inRangeIds;
uniform float featureMin;
uniform float featureMax;

uniform vec2 canvasToFrameScale;
uniform sampler2D colorRamp;
uniform vec3 backgroundColor;

/** MUST be synchronized with the DrawMode enum in ColorizeCanvas! */
const uint DRAW_MODE_HIDE = 0u;
const uint DRAW_MODE_RAMP = 1u;
const uint DRAW_MODE_COLOR = 2u;

uniform vec3 outlierColor;
uniform uint outlierDrawMode;
uniform vec3 outOfRangeColor;
uniform uint outOfRangeDrawMode;

uniform int highlightedId;

uniform bool hideOutOfRange;  // bool

in vec2 vUv;

layout (location = 0) out vec4 gOutputColor;

// Combine non-alpha color channels into one 24-bit value
uint combineColor(uvec4 color) {
  return (color.b << 16u) | (color.g << 8u) | color.r;
}

float getFeatureVal(int index) {
  int width = textureSize(featureData, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(featureData, featurePos, 0).r;
}

uint getOutlierVal(int index) {
  int width = textureSize(outlierData, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(outlierData, featurePos, 0).r;
}

bool getInRange(int index) {
  int width = textureSize(inRangeIds, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(inRangeIds, featurePos, 0).r == 1u;
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
  int R = int(combineColor(texture(frame, uv + vec2(thickness * wStep, 0)))) - 1;
  int L = int(combineColor(texture(frame, uv + vec2(-thickness * wStep, 0)))) - 1;
  int T = int(combineColor(texture(frame, uv + vec2(0, thickness * hStep)))) - 1;
  int B = int(combineColor(texture(frame, uv + vec2(0, -thickness * hStep)))) - 1;
  // if any neighbors are not highlightedId then color this as edge
  return (R != highlightedId || L != highlightedId || T != highlightedId || B != highlightedId);
}

vec4 getColorFromDrawMode(uint drawMode, vec3 defaultColor, float normFeatureVal) {
  if (drawMode == DRAW_MODE_HIDE) {
    return vec4(backgroundColor, 1.0);
  } else if (drawMode == DRAW_MODE_COLOR) {
    return vec4(defaultColor, 1.0);
  } else {
    return getColorRamp(normFeatureVal);
  }
}

void main() {
  // Scale uv to compensate for the aspect of the frame
  ivec2 frameDims = textureSize(frame, 0);
  vec2 sUv = (vUv - 0.5) * canvasToFrameScale + 0.5;

  // This pixel is background if, after scaling uv, it is outside the frame
  if (sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  }

  // Get the segmentation id at this pixel
  uint id = combineColor(texture(frame, sUv));

  // A segmentation id of 0 represents background
  if (id == 0u) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  } else if (int(id) - 1 == highlightedId) {
    // do an outline around highlighted object
    if (isEdge(sUv, frameDims)) {
      gOutputColor = vec4(1.0, 0.0, 1.0, 1.0);
      return;
    }
  }

  // Data buffer starts at 0, non-background segmentation IDs start at 1
  float featureVal = getFeatureVal(int(id) - 1);
  uint outlierVal = getOutlierVal(int(id) - 1);
  bool isInRange = getInRange(int(id) - 1);
  float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);

  // Use the selected draw mode to handle out of range and outlier values;
  // otherwise color with the color ramp as usual.
  bool isOutOfRange = !isInRange || normFeatureVal < 0.0 || normFeatureVal > 1.0;
  bool isOutlier = isinf(featureVal) || outlierVal != 0u;

  if (isOutlier) {
    gOutputColor = getColorFromDrawMode(outlierDrawMode, outlierColor, normFeatureVal);
  } else if (isOutOfRange) {
    gOutputColor = getColorFromDrawMode(outOfRangeDrawMode, outOfRangeColor, normFeatureVal);
  } else {
    gOutputColor = getColorRamp(normFeatureVal);
  }
}
