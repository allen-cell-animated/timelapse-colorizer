precision highp int;

// TODO: Also write out normal and depth in the future?
layout (location = 0) out vec4 gOutputColor;

float THRESHOLD = 0.5;

// Per-instance attributes
uniform uint instanceId;

// uniform float pointRadiusPx;
// uniform float antialiasEdgePx;

void main() {
    vec2 uv = gl_PointCoord;
    float dist = distance(uv, vec2(0.5));

    // Cull pixels outside of the circle to create round points
    if (dist > THRESHOLD) {
        discard;
    } 

    // // Apply a smooth edge to the points
    // // float edgeSoftness = antialiasEdgePx / pointRadiusPx;
    // // float alpha = smoothstep(THRESHOLD, THRESHOLD - edgeSoftness, dist);
    // gl_FragDepth = dist;
    gOutputColor = vec4(1.0, 0.0, 0.0, 1.0);

}