precision highp usampler2D;

uniform usampler2D frame;
uniform usampler2D framePoints;
uniform vec2 canvasToFrameScale;
uniform vec2 panOffset;

in vec2 vUv;

layout (location = 0) out uvec4 gOutputColor;

void main() {
  // Scale uv to compensate for the aspect of the frame
  ivec2 frameDims = textureSize(frame, 0);
  vec2 sUv = (vUv - 0.5) * canvasToFrameScale + 0.5 - panOffset;

  // This pixel is background if, after scaling uv, it is outside the frame
  if (sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0) {
    gOutputColor = uvec4(0, 0, 0, 0);
    return;
  }

  // Get the ID at this pixel; centroid points are drawn on top of segmentations
  // so those IDs take priority if present.
  uvec4 pointData = texture(framePoints, vUv);
  if (pointData.a > 0u) {
    gOutputColor = pointData;
    return;
  }
  uvec4 segData = texture(frame, sUv);
  gOutputColor = segData;
}
