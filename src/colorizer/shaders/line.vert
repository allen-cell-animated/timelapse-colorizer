out vec2 vUv;

uniform vec2 frameDimensions;
uniform vec4 frameToCanvasScale;

void main() {

    // Vertex coords are in pixel coordinates on the original texture.
    // However, the canvas coordinates are given in a [-1, 1] range,
    // where (1, 1) is the top right corner.
    // Normalize to [0, 1] 
    vec3 normalizedPosition = position;
    normalizedPosition.x = (position.x / float(frameDimensions.x)) * 2. - 1.;
    normalizedPosition.y = -((position.y / float(frameDimensions.y)) * 2. - 1.);

    vUv = uv;
    // Transform vertex positions, which are given in frame coordinates, to canvas coordinates.
    gl_Position = vec4(normalizedPosition, 1) * frameToCanvasScale;
}
