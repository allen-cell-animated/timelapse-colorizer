import { GLSL3, ShaderMaterial, UniformsUtils } from "three";

import fragmentShader from "./point.frag";
import vertexShader from "./point.vert";

export const enum PointMaterialInstanceAttributes {
  POSITION = "instancePosition",
  LABEL_ID = "instanceId",
}

/**
 * Draws circular points using the RGB color to encode the instance ID. This
 * matches the encoding scheme used in segmentation image data, so IDs can be
 * read from both in the same way.
 *
 * Note that the alpha channel is reserved for antialiasing effects.
 *
 * The following uniforms can be set:
 * - `baseScale`: a multiplier for the radius of each point, in onscreen pixels.
 * - `antialiasPx`: the width in pixels of the antialiased edges of the points.
 *
 * Also expects the following attributes:
 * - `instancePosition`: a Vector4 representing the position of each point in
 *   world space. The `w` component is used to encode the radius of each point.
 * - `instanceId`: an unsigned 32-bit integer representing the instance ID of
 *   each point.
 */
export default class PointMaterial2D extends ShaderMaterial {
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
        antialiasPx: { value: 2 },
      },
    ]);
  }

  /**
   * Base scale for the points in onscreen pixels, multiplied against the
   * instance position's `w` component.
   */
  set baseScale(value: number) {
    this.uniforms.baseScale.value = value;
  }

  /**
   * The width in pixels of the antialiased edges of the points.
   */
  set antialiasPx(value: number) {
    this.uniforms.antialiasPx.value = value;
  }
}
