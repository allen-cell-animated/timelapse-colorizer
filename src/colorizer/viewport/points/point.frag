/**
 * Draws a circular point for each instance, using the RGB color to encode the 
 * instance ID.
 * 
 * The alpha channel is reserved for smooth rendering and encoding the distance
 * from the edge of the shape for outlining effects.
 */
precision highp int;

layout (location = 0) out uvec4 gOutputColor;

float THRESHOLD = 0.5;
uniform float antialiasPx;

// Per-instance attributes
flat in uint IN_instanceId;
flat in float IN_radius;

/** Encodes instance ID as an RGB value. */
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

  // Apply a smooth edge to the points
  float edgeSoftness = antialiasPx / IN_radius;
  float alpha = smoothstep(THRESHOLD, THRESHOLD - edgeSoftness, dist);
  gl_FragDepth = dist;

  uvec3 color = getInstanceColor(IN_instanceId);
  gOutputColor = uvec4(color, uint(alpha * 255.0));
}
