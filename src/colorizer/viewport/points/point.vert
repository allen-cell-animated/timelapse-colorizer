#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float pointRadiusPx;

out vec2 vUv;
out vec3 color;

void main() {
  vUv = uv;
  color = instanceColor;

  // Vertices are assigned as follows in the quad:
  // 0 - 1
  // | / |
  // 2 - 3

  // Expand vertices by the pointRadiusPx to get the final radius.
  // In the default quad, vertices are positioned at +/- 0.5, so 
  // we subtract 0.5 from the radius here.
  vec3 pos = vec3(position);
  float radius = pointRadiusPx - 0.5;
  if (gl_VertexID == 0 || gl_VertexID == 2) {
    pos.x -= radius;
  } else {
    pos.x += radius;
  }
  if (gl_VertexID < 2) {
    pos.y += radius;
  } else {
    pos.y -= radius;
  }

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(pos, 1.0);
}
