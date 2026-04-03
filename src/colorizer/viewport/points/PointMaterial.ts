import { GLSL3, ShaderMaterial, UniformsUtils } from "three";

import fragmentShader from "./point.frag";
import vertexShader from "./point.vert";

export default class PointMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      glslVersion: GLSL3,
    });

    this.uniforms = UniformsUtils.merge([
      this.uniforms,
      {
        // TODO: Can this value be per-instance?
        baseScale: { value: 1 },
        // antialiasEdgePx: { value: 0.05 },
      },
    ]);
  }

  set baseScale(value: number) {
    this.uniforms.baseScale.value = value;
  }

  // set antialiasEdgePx(value: number) {
  //   this.uniforms.antialiasEdgePx.value = value;
  // }
}
