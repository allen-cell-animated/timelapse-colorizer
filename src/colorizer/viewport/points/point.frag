precision highp int;

in vec2 vUv;
in vec3 color;

layout (location = 0) out vec4 gOutputColor;

void main() {
    vec2 uv = vUv;
    float dist = distance(uv, vec2(0.5));
    if (dist > 0.5) {
        discard;
    }
    // gOutputColor = uvec4(color * 255.0, 255);
    gOutputColor = vec4(5.0 / 255.0, 0.0, 0.0, 1.0);
}