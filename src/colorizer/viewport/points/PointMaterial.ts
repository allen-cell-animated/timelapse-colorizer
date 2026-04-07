import { GLSL3, ShaderMaterial, UniformsUtils } from "three";

import fragmentShader from "./point.frag";
import vertexShader from "./point.vert";

export const enum PointMaterialInstanceAttributes {
  POSITION = "instancePosition",
  LABEL_ID = "instanceId",
}

/**
 * Draws circular points, using the RGB color to encode the instance ID.
 */
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
        baseScale: { value: 1 },
      },
    ]);
  }

  set baseScale(value: number) {
    this.uniforms.baseScale.value = value;
  }
}
