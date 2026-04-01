import { ShaderMaterial } from "three";

import fragmentShader from "./point.frag";

export default class PointMaterial extends ShaderMaterial {
  constructor() {
    super({
      fragmentShader,
    });
  }
}
