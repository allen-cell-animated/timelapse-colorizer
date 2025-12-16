// Adapted from Three.js LineMaterial shader, but with some options
// (WORLD_UNITS, USE_DASH) removed and support for culling vertices. See:
// https://github.com/mrdoob/three.js/blob/master/examples/jsm/lines/LineMaterial.js

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float linewidth;
uniform vec2 resolution;

uniform uint minInstance;

attribute vec3 instanceStart;
attribute vec3 instanceEnd;
attribute vec3 instanceColorStart;
attribute vec3 instanceColorEnd;

varying vec2 vUv;

void trimSegment(const in vec4 start, inout vec4 end) {
  // trim end segment so it terminates between the camera plane and the near plane
  // conservative estimate of the near plane
  float a = projectionMatrix[2][2]; // 3nd entry in 3th column
  float b = projectionMatrix[3][2]; // 3nd entry in 4th column
  float nearEstimate = -0.5 * b / a;
  float alpha = (nearEstimate - start.z) / (end.z - start.z);
  end.xyz = mix(start.xyz, end.xyz, alpha);
}

void main() {
  #ifdef USE_COLOR
  vColor.xyz = (position.y < 0.5) ? instanceColorStart : instanceColorEnd;
  #endif

  // CHANGES FROM ORIGINAL TRACK VERTEX SHADER 
  // -----------------------------
  // cull vertices below minVertex
  if (uint(gl_InstanceID) <= minInstance) {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }
  // -----------------------------

  float aspect = resolution.x / resolution.y;
  // camera space
  vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
  vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);

  vUv = uv;
  // special case for perspective projection, and segments that terminate either in, or behind, the camera plane
  // clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
  // but we need to perform ndc-space calculations in the shader, so we must address this issue directly
  // perhaps there is a more elegant solution -- WestLangley
  bool perspective = (projectionMatrix[2][3] == -1.0); // 4th entry in the 3rd column
  if (perspective) {
    if (start.z < 0.0 && end.z >= 0.0) {
      trimSegment(start, end);
    } else if (end.z < 0.0 && start.z >= 0.0) {
      trimSegment(end, start);
    }
  }
  // clip space
  vec4 clipStart = projectionMatrix * start;
  vec4 clipEnd = projectionMatrix * end;
  // ndc space
  vec3 ndcStart = clipStart.xyz / clipStart.w;
  vec3 ndcEnd = clipEnd.xyz / clipEnd.w;
  // direction
  vec2 dir = ndcEnd.xy - ndcStart.xy;
  // account for clip-space aspect ratio
  dir.x *= aspect;
  dir = normalize(dir);

  vec2 offset = vec2(dir.y, -dir.x);
  // undo aspect ratio adjustment
  dir.x /= aspect;
  offset.x /= aspect;

  // sign flip
  if (position.x < 0.0)
    offset *= -1.0;
  // endcaps
  if (position.y < 0.0) {
    offset += -dir;
  } else if (position.y > 1.0) {
    offset += dir;
  }
  // adjust for linewidth
  offset *= linewidth;
  // adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
  offset /= resolution.y;
  // select end
  vec4 clip = (position.y < 0.5) ? clipStart : clipEnd;
  // back to clip space
  offset *= clip.w;
  clip.xy += offset;

  gl_Position = clip;
  // vec4 mvPosition = (position.y < 0.5) ? start : end; // this is an approximation
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  #include <fog_vertex>
}