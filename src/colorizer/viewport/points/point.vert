out vec2 vUv;
out vec3 color;

void main() {
  vUv = uv;
  color = instanceColor;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
