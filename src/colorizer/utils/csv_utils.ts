import { unparse } from "papaparse";

export type CsvDataColumn = {
  name: string;
  data: number[] | Float32Array | Uint32Array | Uint16Array | Uint8Array;
  categories?: string[];
};

export function columnsToCsv(columns: CsvDataColumn[], delimiter: string = ","): string {
  const headerRow = columns.map((col) => col.name);
  const numRows = columns[0].data.length;

  const csvRows = [];
  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (const column of columns) {
      if (column.categories) {
        row.push(column.categories[column.data[i]]);
      } else {
        row.push(column.data[i].toString());
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
