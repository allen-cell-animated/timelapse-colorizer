uniform highp usampler2D frame;
uniform sampler2D featureData;
uniform float featureMin;
uniform float featureMax;

in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

void main() {
  uint index = texture(frame, vUv).r & 0x00ffffffu;
  float featureVal = texelFetch(featureData, ivec2(index, 0), 0).r;
  gOutputColor = vec4(
    (index & 1u) != 0u ? 1.0 : 0.0,
    (index & 2u) != 0u ? 1.0 : 0.0,
    (index & 4u) != 0u ? 1.0 : 0.0,
    1.0
  );
  // float normFeatureVal = (featureVal - featureMin) / (featureMax - featureMin);
  // gOutputColor = vec4(featureVal == 0.0 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}
