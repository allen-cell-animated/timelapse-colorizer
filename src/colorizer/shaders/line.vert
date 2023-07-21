out vec2 vUv;

uniform highp usampler2D frame;
uniform float aspect;

void main() {
    // Apply scale to account for 
    ivec2 frameDims = textureSize(frame, 0);
    float frameAspect = float(frameDims.x) / float(frameDims.y);
    vec2 scale = max(vec2(aspect / frameAspect, frameAspect / aspect), 1.0);
    vUv = uv;
    // Resize line coordinates with the window
    gl_Position = vec4(position.x / scale.x, position.y / scale.y, position.z, 1.0);
}
