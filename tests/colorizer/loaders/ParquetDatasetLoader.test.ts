// https://vast-files.allencell.org/users/peyton.lee/liberali-data/Liberali_Lightsheet_OMEZarrs/002/Deconv.ome.zarr/tracks/geff_like/nodes.parquet
import { assert, describe, expect, it } from "vitest";

import ParquetDatasetLoader from "src/colorizer/dataset_loaders/ParquetDatasetLoader";

describe("ParquetDatasetLoader", () => {
  it("load sample file", async () => {
    // const url =
    //   "https://vast-files.allencell.org/users/peyton.lee/liberali-data/Liberali_Lightsheet_OMEZarrs/002/Deconv.ome.zarr/tracks/geff_like/nodes.parquet";
    // const loader = new ParquetDatasetLoader(url);
    // const dataset = await loader.open();
    // console.log(dataset);
  });

  describe("Frame 3D info", () => {
    it("returns null if no metadata is provided", () => {
      // throw new Error("Test not implemented");
    });

    it("", () => {
      // throw new Error("Test not implemented");
    });
  });
});
