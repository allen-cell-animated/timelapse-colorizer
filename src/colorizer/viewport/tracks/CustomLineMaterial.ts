import { UniformsUtils } from "three";
import { LineMaterial, LineMaterialParameters } from "three/addons/lines/LineMaterial";

import vertexShader from "./track.vert";

export default class CustomLineMaterial extends LineMaterial {
  /**
   * Constructs a new line segments geometry.
   */
  constructor(params?: LineMaterialParameters) {
    super(params);
    // Reassign vertex shader
    this.vertexShader = vertexShader;
    this.uniforms = UniformsUtils.merge([
      this.uniforms,
      {
        minInstance: { value: 10 },
      },
    ]);
  }
}
