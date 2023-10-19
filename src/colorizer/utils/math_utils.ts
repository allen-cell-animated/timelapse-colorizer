// TODO: Add a formatter for significant digits/scientific notation

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

export function formatDecimal(input: number, decimalPlaces: number, skipIntegers: boolean = true): number {
  return Number.parseFloat(numberToStringDecimal(input, decimalPlaces, skipIntegers));
}
