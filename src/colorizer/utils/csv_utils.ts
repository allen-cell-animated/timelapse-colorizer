import { unparse } from "papaparse";

export type CsvDataColumn = {
  name: string;
  data: (number | undefined | null)[] | Float32Array | Uint32Array | Uint16Array | Uint8Array;
  categories?: string[];
};

/**
 * Takes one or more columns of data and formats them as a CSV string.
 * @param columns The columns of data to format.
 * @param delimiter The delimiter to use in the CSV string. Defaults to ",".
 * @throws Will throw an error if the columns have different numbers of rows or if there are no columns.
 * @returns The formatted CSV string.
 */
export function columnsToCsv(columns: CsvDataColumn[], delimiter: string = ","): string {
  // Validate rows
  if (columns.length === 0) {
    throw new Error("No columns provided.");
  }
  const numRows = columns[0].data.length;
  for (const column of columns) {
    if (column.data.length !== numRows) {
      throw new Error(
        `All columns must have the same number of rows. Expected ${numRows} but got ${column.data.length} in column ${column.name}.`
      );
    }
  }

  const headerRow = columns.map((col) => col.name);

  const csvRows = [];
  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (const column of columns) {
      const value = column.data[i];
      if (value === undefined || value === null) {
        row.push("");
      } else if (column.categories) {
        row.push(column.categories[value]);
      } else {
        row.push(value.toString());
      }
    }
    csvRows.push(row);
  }

  const csvString = unparse(
    {
      fields: headerRow,
      data: csvRows,
    },
    { delimiter, header: true, escapeFormulae: true }
  );
  return csvString;
}
