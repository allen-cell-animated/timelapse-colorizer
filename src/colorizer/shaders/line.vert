out vec2 vUv;

uniform highp usampler2D frame;
uniform vec4 frameToCanvasScale;

void main() {

    ivec2 frameDims = textureSize(frame, 0);

    // Vertex coords are in pixel coordinates on the original texture.
    // Remap X and Y to [-1, 1] relative to the canvas.

    vUv = uv;
    // Transform vertex positions, which are given in frame coordinates, to canvas coordinates.
    gl_Position = vec4(position, 1) * frameToCanvasScale;
}
