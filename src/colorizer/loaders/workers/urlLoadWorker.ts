import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import workerpool from "workerpool";
import Transfer from "workerpool/types/transfer";

async function loadFromParquetUrl(url: string): Promise<Transfer> {
  const result = await fetch(url);
  const arrayBuffer = await result.arrayBuffer();
  let data: Float32Array = new Float32Array(0);
  let dataMin: number | undefined = undefined;
  let dataMax: number | undefined = undefined;
  await parquetRead({
    file: arrayBuffer,
    compressors,
    onComplete: (loadedData: number[][]) => {
      const data = new Float32Array(loadedData.length);
      for (let i = 0; i < loadedData.length; i++) {
        const value = loadedData[i][0];
        dataMin = dataMin === undefined ? value : Math.min(dataMin, value);
        dataMax = dataMax === undefined ? value : Math.max(dataMax, value);
        data[i] = value;
      }
    },
  });
  return new workerpool.Transfer({ min: dataMin, max: dataMax, data }, [data.buffer]);
}

workerpool.worker({
  loadFromParquetUrl: loadFromParquetUrl,
});
