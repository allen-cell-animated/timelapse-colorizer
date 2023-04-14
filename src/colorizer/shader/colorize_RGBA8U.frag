uniform highp usampler2D frame;
uniform sampler2D featureData;
uniform float featureMin;
uniform float featureMax;

uniform vec3 backgroundColor;
uniform vec3 outlierColor;

in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

uint combineColor(uvec4 color) {
  return (color.b << 16u) | (color.g << 8u) | color.r;
}

float getFeatureVal(int index) {
  int width = textureSize(featureData, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(featureData, featurePos, 0).r;
}

void main() {
  uint index = combineColor(texture(frame, vUv));

  if (index == 0u) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  }

  // Data buffer starts at 0, segmentation IDs start at 1
  float featureVal = getFeatureVal(int(index) - 1);

  if (isnan(featureVal) || featureVal == 0.0) {
    gOutputColor = vec4(outlierColor, 1.0);
  } else {
    float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);
    gOutputColor = vec4(0.0, 0.0, normFeatureVal, 1.0);
  }
}
