precision highp int;

in vec2 vUv;
in vec3 color;

layout (location = 0) out vec4 gOutputColor;

float threshold = 0.5;
float edgeSoftness = 0.01;

uniform float pointRadiusPx;

void main() {
    vec2 uv = vUv;
    float dist = distance(uv, vec2(0.5));

    // Cull pixels outside of the circle to create round points
    if (dist > threshold) {
        discard;
    } 

    // Apply a smooth edge to the points
    float alpha = smoothstep(threshold, threshold - edgeSoftness, dist);
    gl_FragDepth = dist;
    gOutputColor = vec4(color, alpha);

}