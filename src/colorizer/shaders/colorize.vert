out vec2 vUv;

uniform vec2 canvasCenterCoords;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
