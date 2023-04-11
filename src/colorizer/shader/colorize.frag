uniform sampler2D frame;
uniform sampler2D featureData;
uniform float featureMin;
uniform float featureMax;

in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

void main() {
  gOutputColor = texture(frame, vUv);
}
