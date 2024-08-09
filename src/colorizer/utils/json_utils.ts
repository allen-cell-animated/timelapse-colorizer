/**
 * Replaces all NaN in string text (such as the string representation of a JSON
 * object) with null. Can be used to safely parse JSON objects with NaN values.
 */
export const nanToNull = (json: string): string => json.replace(/NaN/g, "null");
