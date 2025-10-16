import type { Matrix4 } from "three";

import type { IRenderCanvas } from "./IRenderCanvas";

export interface IInnerRenderCanvas extends IRenderCanvas {
  /**
   * Sets a callback function that will be called whenever the canvas is
   * rendered.
   */
  setOnRenderCallback(callback: null | (() => void)): void;

  /**
   * Returns a Matrix4 that projects from a 3D coordinate (in frame
   * pixels/volume voxels) to a 2D canvas pixel coordinate, where
   * (X=0, Y=0) is the top left corner of the canvas, and a depth value.
   *
   * The Z coordinate is used to store the depth in a [0, 1] range, where 0 is
   * the closest to the camera and 1 is the farthest from the camera.
   */
  getScreenSpaceMatrix(): Matrix4;

  /**
   * Returns a function that converts a depth value for some object to the
   * opacity (when covered) and scale of an annotation marker that should be
   * rendered over it.
   * @param screenSpaceMatrix The screen space matrix that projects from 3D
   * coordinates to 2D canvas pixel coordinates and depth. See
   * `getScreenSpaceMatrix()`.
   */
  getDepthToScaleFn(screenSpaceMatrix: Matrix4): (depth: number) => { scale: number; clipOpacity: number };
}
