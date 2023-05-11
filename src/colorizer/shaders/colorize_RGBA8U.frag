precision highp usampler2D;

uniform usampler2D frame;
uniform sampler2D featureData;
uniform usampler2D outlierData;
uniform float featureMin;
uniform float featureMax;

uniform float aspect;
uniform sampler2D colorRamp;
uniform vec3 backgroundColor;
uniform vec3 outlierColor;

uniform int highlightedId;

in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

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

vec4 getColorRamp(float val) {
  float width = float(textureSize(colorRamp, 0).x);
  float range = (width - 1.0) / width;
  float adjustedVal = (0.5 / width) + (val * range);
  return texture(colorRamp, vec2(adjustedVal, 0.5));
}

void main() {
  // Scale uv to compensate for the aspect of the frame
  ivec2 frameDims = textureSize(frame, 0);
  float frameAspect = float(frameDims.x) / float(frameDims.y);
  vec2 scale = max(vec2(aspect / frameAspect, frameAspect / aspect), 1.0);
  vec2 sUv = (vUv - 0.5) * scale + 0.5;

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
  }
  else if (int(id) - 1 == highlightedId) {
    gOutputColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }

  // Data buffer starts at 0, non-background segmentation IDs start at 1
  float featureVal = getFeatureVal(int(id) - 1);
  uint outlierVal = getOutlierVal(int(id) - 1);

  if (isinf(featureVal) || outlierVal != 0u) {
    // outlier
    gOutputColor = vec4(outlierColor, 1.0);
  } else {
    float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);
    gOutputColor = getColorRamp(normFeatureVal);
  }
}
