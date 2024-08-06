import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import workerpool from "workerpool";

async function loadFromParquetUrl(
  url: string
): Promise<{ data: number[]; min: number | undefined; max: number | undefined }> {
  const result = await fetch(url);
  const arrayBuffer = await result.arrayBuffer();
  let data: number[] = [];
  let dataMin: number | undefined = undefined;
  let dataMax: number | undefined = undefined;
  await parquetRead({
    file: arrayBuffer,
    compressors,
    onComplete: (loadedData: number[][]) => {
      for (const row of loadedData) {
        dataMin = dataMin === undefined ? row[0] : Math.min(dataMin, row[0]);
        dataMax = dataMax === undefined ? row[0] : Math.max(dataMax, row[0]);
        data.push(row[0]);
      }
      data = loadedData.map((row) => Number(row[0]));
    },
  });
  return { data, min: dataMin, max: dataMax };
}

workerpool.worker({
  loadFromParquetUrl: loadFromParquetUrl,
});
