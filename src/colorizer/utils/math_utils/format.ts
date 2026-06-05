/**
 * Formats a number as a string decimal, with a maximum number of significant
 * digits after the decimal place.
 * @param input The number to format.
 * @param maxSignificantDigitsAfterDecimal The maximum number of significant
 * digits after the decimal place. If `input` is less than 1, this will be the
 * number of significant digits. If `input` is greater than 1, this will be the
 * number of digits after the decimal point.
 * @param showIntegersAsDecimals If true, integers will be shown as numbers with
 * decimal points. False by default.
 * @returns A string representation of the number.
 * - If the number is `undefined` or `null`, returns `"NaN"`.
 * - If the number is an integer and `showIntegersAsDecimals` is false, returns
 *   the number as a string without a decimal point.
 * - If the number is less than 1, returns the number with
 *   `maxSignificantDigitsAfterDecimal` significant digits. (using
 *   `toPrecision`).
 * - Otherwise, returns the number with `maxSignificantDigitsAfterDecimal`
 *   digits after the decimal point (using `toFixed`).
 *
 */
export function formatNumber(
  input: number | undefined | null,
  maxSignificantDigitsAfterDecimal: number,
  showIntegersAsDecimals: boolean = false
): string {
  if (input === undefined || input === null) {
    return "NaN";
  } else if (Number.isInteger(input) && !showIntegersAsDecimals) {
    return input.toString();
  } else if (Math.abs(input) < 1) {
    // For numbers less than 1, return value by precision
    return input.toPrecision(maxSignificantDigitsAfterDecimal);
  } else {
    return input.toFixed(maxSignificantDigitsAfterDecimal);
  }
}

/**
 * Returns the number with a maximum number of digits after the decimal place, rounded to nearest.
 */
export function setMaxDecimalPrecision(input: number, decimalPlaces: number): number {
  return Number.parseFloat(formatNumber(input, decimalPlaces, true));
}

// Adapted from https://gist.github.com/ArneS/2ecfbe4a9d7072ac56c0.
function digitToUnicodeSupercript(n: number): string {
  const subst = [0x2070, 185, 178, 179, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079];
  return String.fromCharCode(subst[n]);
}

function numberToUnicodeSuperscript(input: number): string {
  const prefix = input < 0 ? "⁻" : "";
  const digits = Math.abs(input).toString().split("");
  return prefix + digits.map((digit) => digitToUnicodeSupercript(parseInt(digit, 10))).join("");
}

/**
 * Converts a number to scientific notation with the specified number of significant
 * figures, handling negative numbers and rounding.
 * @param input The number to convert.
 * @param significantFigures the number of signficant figures/digits. Must be >= 1.
 * @returns a string, formatted as a number in scientific notation.
 * @example
 * ```
 * numberToSciNotation(1, 3) // "1.00×10⁰"
 * numberToSciNotation(0.99, 2) // "9.9×10⁻¹"
 * numberToSciNotation(0.999, 2) // "1.0×10⁰"
 * numberToSciNotation(-0.05, 1) // "-5×10⁻²"
 * numberToSciNotation(1400, 3) // "1.40×10³"
 * ```
 */
export function numberToSciNotation(input: number, significantFigures: number): string {
  significantFigures = Math.max(significantFigures, 1);
  const prefix = input < 0 ? "-" : "";
  input = Math.abs(input);
  // Apply precision in case it causes input to round up to the next power of 10.
  // For example, if input = 0.99 and significantFigures = 1, we want to round to 1 now.
  // Otherwise we'd get `exponent = -1` and 10×10⁻¹ instead of 1×10⁰.
  // See unit tests for validation.
  input = Number.parseFloat(input.toPrecision(significantFigures));
  if (input === 0) {
    return "0×10⁰";
  }
  const exponent = Math.floor(Math.log10(input));
  const coefficient = input / 10 ** exponent;
  return `${prefix}${coefficient.toFixed(significantFigures - 1)}×10${numberToUnicodeSuperscript(exponent)}`;
}

export function getDisplayDateString(date: Date): string {
  try {
    return date.toLocaleString("en-US", { timeZoneName: "short" });
  } catch {
    return date.toISOString();
  }
}

export function getBuildDisplayDateString(): string {
  return getDisplayDateString(new Date(Number.parseInt(import.meta.env.VITE_BUILD_TIME_UTC, 10)));
}
