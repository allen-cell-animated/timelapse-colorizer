import { GLSL3, ShaderMaterial, UniformsUtils, Vector2 } from "three";

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
        pointRadiusPx: { value: 1 }, // TODO: Can this value be per-instance?
        canvasResolution: { value: new Vector2(1, 1) },
        zoomMultiplier: { value: 1 },
      },
    ]);
  }

  set pointRadiusPx(value: number) {
    this.uniforms.pointRadiusPx.value = value;
  }

  set canvasResolution(value: Vector2) {
    this.uniforms.canvasResolution.value = value;
  }

  set zoomMultiplier(value: number) {
    this.uniforms.zoomMultiplier.value = value;
  }
}
