#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

// Per-instance attributes
in vec4 instancePosition;
in uint instanceId;

flat out uint IN_instanceId;
flat out float IN_radius;

// General uniforms
uniform float baseScale;

void main() {
  vec3 pos = instancePosition.xyz;
  float scale = instancePosition.w * baseScale;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = scale;
  IN_instanceId = instanceId;
  IN_radius = scale;
}
