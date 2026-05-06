import { describe, expect, it } from "vitest";

import { columnsToCsv, type CsvDataColumn } from "src/colorizer/utils/csv_utils";
import { ANY_ERROR } from "tests/utils";

describe("columnsToCsv", () => {
  it("handles single column", () => {
    const column: CsvDataColumn = { name: "col1", data: [1, 2, 3] };
    const result = columnsToCsv([column]);
    expect(result).toBe("col1\r\n1\r\n2\r\n3");
  });

  it("handles multiple columns", () => {
    const column1: CsvDataColumn = { name: "col1", data: [1, 2, 3] };
    const column2: CsvDataColumn = { name: "col2", data: [4, 5, 6] };
    const column3: CsvDataColumn = { name: "col3", data: [7, 8, 9] };
    const result = columnsToCsv([column1, column2, column3]);
    expect(result).toBe("col1,col2,col3\r\n1,4,7\r\n2,5,8\r\n3,6,9");
  });

  it("converts categorical data", () => {
    const column1: CsvDataColumn = { name: "col1", data: [0, 1, 2], categories: ["A", "B", "C"] };
    const result = columnsToCsv([column1]);
    expect(result).toBe("col1\r\nA\r\nB\r\nC");
  });

  it("throws error if no columns are provided", () => {
    expect(() => columnsToCsv([])).toThrowError(ANY_ERROR);
  });

  it("throws error if columns have mismatched data length", () => {
    const column1: CsvDataColumn = { name: "col1", data: [1, 2, 3] };
    const column2: CsvDataColumn = { name: "col2", data: [4, 5] };
    expect(() => columnsToCsv([column1, column2])).toThrowError(ANY_ERROR);
  });

  it("handles empty data arrays", () => {
    const column1: CsvDataColumn = { name: "col1", data: [] };
    const result = columnsToCsv([column1]);
    expect(result).toBe("col1\r\n");
  });

  it("uses alternative delimiters", () => {
    const column1: CsvDataColumn = { name: "col1", data: [1, 2, 3] };
    const column2: CsvDataColumn = { name: "col2", data: [4, 5, 6] };
    const result = columnsToCsv([column1, column2], ";");
    expect(result).toBe("col1;col2\r\n1;4\r\n2;5\r\n3;6");
  });

  it("escapes string values", () => {
    const column1: CsvDataColumn = { name: "col1", data: [0, 1, 2], categories: ["a", "b,c", 'd"e'] };
    const result = columnsToCsv([column1]);
    expect(result).toBe('col1\r\na\r\n"b,c"\r\n"d""e"');
  });

  it("allows special characters", () => {
    const column1: CsvDataColumn = { name: "Feature 1 (µm)", data: [1, 2, 3] };
    const result = columnsToCsv([column1]);
    expect(result).toBe("Feature 1 (µm)\r\n1\r\n2\r\n3");
  });
});
