out vec2 vUv;

uniform highp usampler2D frame;
uniform vec2 scale;

void main() {

    ivec2 frameDims = textureSize(frame, 0);

    // Vertex coords are in pixel coordinates on the original texture.
    // Remap X and Y to [-1, 1] relative to the canvas.

    vUv = uv;
    // Resize line coordinates with the window
    //(vUv - 0.5) * scale + 0.5;
    gl_Position = vec4(position.x / scale.x, position.y / scale.y, position.z, 1.0);
}
