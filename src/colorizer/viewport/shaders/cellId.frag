precision highp usampler2D;

uniform sampler2D frame;
uniform vec2 canvasToFrameScale;
uniform vec2 panOffset;

in vec2 vUv;

layout (location = 0) out vec4 gOutputColor;

void main() {
  // Scale uv to compensate for the aspect of the frame
  vec2 sUv = (vUv - 0.5) * canvasToFrameScale + 0.5 - panOffset;

  // This pixel is background if, after scaling uv, it is outside the frame
  if (sUv.x < 0.0 || sUv.y < 0.0 || sUv.x > 1.0 || sUv.y > 1.0) {
    gOutputColor = vec4(0, 0, 0, 0);
    return;
  }

  // Get the segmentation id at this pixel and write it out
  vec4 floatId = texture(frame, sUv);
  floatId.a = 0.0;
  gOutputColor = floatId;
}
