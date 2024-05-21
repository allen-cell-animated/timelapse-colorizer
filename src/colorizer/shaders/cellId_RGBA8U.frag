precision highp usampler2D;

uniform usampler2D frame;
uniform vec2 canvasToFrameScale;
uniform vec2 canvasCenterCoords;

in vec2 vUv;

layout (location = 0) out vec4 gOutputColor;

// Combine non-alpha color channels into one 24-bit value
uint combineColor(uvec4 color) {
  return (color.b << 16u) | (color.g << 8u) | color.r;
}
vec4 uncombineColor(uint value) {
  uint a = (value >> 24) & 0xFFu;
  uint b = (value >> 16) & 0xFFu;
  uint g = (value >> 8) & 0xFFu;
  uint r = (value >> 0) & 0xFFu;
  return vec4(float(r) / 255.0, float(g) / 255.0, float(b) / 255.0, float(a) / 255.0);
}

void main() {
  // Scale uv to compensate for the aspect of the frame
  ivec2 frameDims = textureSize(frame, 0);
  vec2 sUv = (vUv - 0.5) / canvasToFrameScale + 0.5 - canvasCenterCoords;

  // This pixel is background if, after scaling uv, it is outside the frame
  if (sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0) {
    gOutputColor = vec4(0, 0, 0, 0);
    return;
  }

  // Get the segmentation id at this pixel
  uint id = combineColor(texture(frame, sUv));

  // write this id out and we're done.
  vec4 v = uncombineColor(id);
  gOutputColor = v;
}
