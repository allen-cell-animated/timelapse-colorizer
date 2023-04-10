in vec2 vUv;

layout(location = 0) out vec4 gOutputColor;

void main() {
  gOutputColor = vec4(abs(vUv.x), 0.0, abs(vUv.y), 1.0);
}
