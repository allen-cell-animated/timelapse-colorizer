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

/**
 * Returns a copy of an object where any properties with a value of `undefined`
 * are not included.
 */
export function removeUndefinedProperties<T>(object: T): Partial<T> {
  const ret: Partial<T> = {};
  for (const key in object) {
    if (object[key] !== undefined) {
      ret[key] = object[key];
    }
  }
  return ret;
}

/**
 * Returns the set of keys that have differing values between two objects.
 */
export const getDifferingProperties = <T extends Record<string, any>>(a: Partial<T>, b: Partial<T>): Set<keyof T> => {
  const differingKeys = new Set<keyof T>();
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) {
      differingKeys.add(key);
    }
  }
  return differingKeys;
};

/** Calls the setter with the provided value if not `undefined`. */
export const setValueIfDefined = <T>(value: T | undefined, setter: (value: T) => void): void => {
  if (value !== undefined) {
    setter(value);
  }
};
