precision highp usampler2D;
precision highp int;

void main() {
    vec2 uv = vUv;
    float dist = distance(uv, vec2(0.5));
    if (dist > 0.5) {
        discard;
    }
    gOutputColor = vec4(1.0);
}