uniform highp isampler2D frame;
uniform sampler2D featureData;
uniform float featureMin;
uniform float featureMax;

uniform float aspect;
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
  // Scale to match the aspect of the frame
  ivec2 frameDims = textureSize(frame, 0);
  float frameAspect = float(frameDims.x) / float(frameDims.y);
  vec2 scale = max(vec2(aspect / frameAspect, frameAspect / aspect), 1.0);
  vec2 sUv = (vUv - 0.5) * scale + 0.5;

  if (sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  }

  int index = texture(frame, sUv).r & MASK;

  if (index == 0) {
    gOutputColor = vec4(backgroundColor, 1.0);
    return;
  }

  // Data buffer starts at 0, segmentation IDs start at 1
  float featureVal = getFeatureVal(index - 1);
  if (isnan(featureVal) || featureVal == 0.0) {
    gOutputColor = vec4(outlierColor, 1.0);
  } else {
    float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);
    gOutputColor = vec4(0.0, 0.0, normFeatureVal, 1.0);
  }
}
