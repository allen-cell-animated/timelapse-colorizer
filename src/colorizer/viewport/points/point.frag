precision highp int;

// TODO: Also write out normal and depth in the future?
layout (location = 0) out uvec4 gOutputColor;

float THRESHOLD = 0.5;
float ANTIALIAS_PX = 1.0;

// Per-instance attributes
flat in uint IN_instanceId;
flat in float IN_radius;

uvec3 getInstanceColor(uint value) {
  uint b = (value >> 16) & 0xFFu;
  uint g = (value >> 8) & 0xFFu;
  uint r = (value >> 0) & 0xFFu;
  return uvec3(r, g, b);
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

  uvec3 color = getInstanceColor(IN_instanceId);
  gOutputColor = uvec4(color, uint(alpha * 255.0));
}