import { UniformsUtils } from "three";
import { LineMaterial, type LineMaterialParameters } from "three/addons/lines/LineMaterial";

import vertexShader from "./track.vert";

type SubrangeLineMaterialParameters = LineMaterialParameters & {
  minInstance?: number;
};

/**
 * Replacement for LineMaterial with custom vertex shader to support showing
 * only a subrange of line segments. Use with `instanceCount` on the geometry
 * and the `minInstance` uniform to control the visible range.
 */
export default class SubrangeLineMaterial extends LineMaterial {
  /**
   * Constructs a new line segments geometry.
   */
  constructor(params?: SubrangeLineMaterialParameters) {
    super(params);

    this.vertexShader = vertexShader;
    this.uniforms = UniformsUtils.merge([
      this.uniforms,
      {
        minInstance: { value: params?.minInstance ?? 0 },
      },
    ]);
    this.uniformsNeedUpdate = true;
  }

  /**
   * The minimum instance index to render. Instances below this index will not
   * be visible. Use with `instanceCount` on the geometry to show a subrange of
   * line segments.
   */
  set minInstance(value: number) {
    this.uniforms.minInstance.value = value;
  }
}
