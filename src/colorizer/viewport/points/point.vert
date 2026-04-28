/**
 * Vertex shader for rendering points; applies per-instance position and scaling
 * and passes parameters (instanceId and radius) to the fragment shader.
 */

// Per-instance attributes
in vec4 instancePosition;
in uint instanceId;

flat out uint IN_instanceId;
flat out float IN_radius;

// General uniforms
uniform float baseScale;
uniform float antialiasPx;

void main() {
  vec3 pos = instancePosition.xyz;
  float scale = instancePosition.w * baseScale + (antialiasPx * 0.5);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = scale;
  IN_instanceId = instanceId;
  IN_radius = scale;
}
