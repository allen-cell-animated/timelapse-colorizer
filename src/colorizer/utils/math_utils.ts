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

// Adapted from https://gist.github.com/ArneS/2ecfbe4a9d7072ac56c0.
function digitToUnicodeSupercript(n: number): string {
  const subst = [0x2070, 185, 178, 179, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079];
  return String.fromCharCode(subst[n]);
}

function numberToUnicodeSuperscript(input: number): string {
  let prefix = input < 0 ? "⁻" : "";
  const digits = Math.abs(input).toString().split("");
  return prefix + digits.map((digit) => digitToUnicodeSupercript(parseInt(digit))).join("");
}

export function numberToSciNotation(input: number, precision: number): string {
  // TODO: Notate differences in precision between scientific notation and js precision
  precision = Math.max(precision, 1);
  const prefix = input < 0 ? "-" : "";
  // Round to the precision + 1 in case the input increments
  // For example, if input = 0.99 and precision = 1, we want to round to 1.
  // If we round later, we'll get 10×10⁻¹ instead of 1×10⁰.
  input = Math.abs(input);
  input = Number.parseFloat(input.toPrecision(Math.max(precision, 1)));
  if (input === 0) {
    return "0×10⁰";
  }
  const exponent = Math.floor(Math.log10(input));
  const coefficient = input / 10 ** exponent;
  return `${prefix}${coefficient.toFixed(precision - 1)}×10${numberToUnicodeSuperscript(exponent)}`;
}
