// TODO: Add a formatter for significant digits/scientific notation

/**
 * Formats a number as a string decimal with a defined number of digits
 * after the decimal place. Optionally ignores integers and returns them as-is.
 */
export function numberToStringDecimal(
  input: number | undefined,
  decimalPlaces: number,
  skipIntegers: boolean = true
): string {
  if (input === undefined) {
    return "NaN";
  }
  if (Number.isInteger(input) && skipIntegers) {
    return input.toString();
  }
  return input.toFixed(decimalPlaces);
}

/**
 * Returns the number with a maximum number of digits after the decimal place, rounded to nearest.
 */
export function setMaxDecimalPrecision(input: number, decimalPlaces: number): number {
  return Number.parseFloat(numberToStringDecimal(input, decimalPlaces, true));
}
