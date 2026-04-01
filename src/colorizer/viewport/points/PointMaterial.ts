import { GLSL3, ShaderMaterial } from "three";

import fragmentShader from "./point.frag";
import vertexShader from "./point.vert";

export default class PointMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      glslVersion: GLSL3,
    });
  }
}
