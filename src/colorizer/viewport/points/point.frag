precision highp int;

// TODO: Also write out normal and depth in the future?
layout (location = 0) out vec4 gOutputColor;

float THRESHOLD = 0.5;
float ANTIALIAS_PX = 0.5;

// Per-instance attributes
flat in uint IN_instanceId;
flat in float IN_radius;

vec3 getInstanceColor(uint value) {
  uint b = (value >> 16) & 0xFFu;
  uint g = (value >> 8) & 0xFFu;
  uint r = (value >> 0) & 0xFFu;
  return vec3(float(r) / 255.0, float(g) / 255.0, float(b) / 255.0);
}

void main() {
  vec2 uv = gl_PointCoord;
  float dist = distance(uv, vec2(0.5));

  // Cull pixels outside of the circle to create round points
  if (dist > THRESHOLD) {
    discard;
  } 

  // // Apply a smooth edge to the points
  float edgeSoftness = ANTIALIAS_PX / IN_radius;
  float alpha = smoothstep(THRESHOLD, THRESHOLD - edgeSoftness, dist);
  gl_FragDepth = dist;
  vec3 color = getInstanceColor(IN_instanceId);
  gOutputColor = vec4(color, alpha);
}