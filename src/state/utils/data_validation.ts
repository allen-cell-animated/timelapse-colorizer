import { clamp } from "three/src/math/MathUtils";

/**
 * Clamps the value between the min and max values, inclusive, and throws an
 * error if the value is `NaN`.
 * @throws {Error} If the value is `NaN`.
 */
export const clampWithNanCheck = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    throw new Error(`Invalid value to clamp: ${value}`);
  }
  return clamp(value, min, max);
};

/**
 * Throws an error if the value is not a finite number.
 */
export const validateFiniteValue = (value: number, source: string): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`${source}: Value ${value} is invalid.`);
  }
  return value;
};
