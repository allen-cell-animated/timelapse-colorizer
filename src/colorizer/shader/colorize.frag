uniform highp isampler2D frame;
uniform sampler2D featureData;
uniform float featureMin;
uniform float featureMax;

uniform vec3 backgroundColor;
uniform vec3 outlierColor;

in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

// if data was generated from an image, the alpha channel may be maxed out
// discard 8 most significant bits
const int MASK = 0x00ffffff;

float getFeatureVal(int index) {
  int width = textureSize(featureData, 0).x;
  ivec2 featurePos = ivec2(index % width, index / width);
  return texelFetch(featureData, featurePos, 0).r;
}

void main() {
  int index = texture(frame, vUv).r & MASK;

  if (index == 0) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  }

  // Data buffer starts at 0, segmentation IDs start at 1
  float featureVal = getFeatureVal(index - 1);
  if (isnan(featureVal)) {
    gOutputColor = vec4(outlierColor, 1.0);
  } else {
    float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);
    gOutputColor = vec4(0.0, 0.0, normFeatureVal, 1.0);
  }
}
