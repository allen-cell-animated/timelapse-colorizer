import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { zipToFileMap } from "../../src/colorizer/utils/data_load_utils";

describe("zipToFileMap", () => {
  it("maps zip file entries to file objects", async () => {
    const zip = new JSZip();
    zip.file("test1.json", "Hello World\n");
    zip.file("dir/test2.json", "Hello World 2\n");
    zip.file("dir/subdir/test3.json", "Hello World 3\n");
    zip.folder("empty_dir");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([zipBlob], "test.zip");

    const fileMap = await zipToFileMap(zipFile);
    expect(fileMap).toEqual({
      // eslint-disable-next-line
      "test1.json": expect.any(File),
      // eslint-disable-next-line
      "dir/test2.json": expect.any(File),
      // eslint-disable-next-line
      "dir/subdir/test3.json": expect.any(File),
    });
  });

  it("strips empty containing directory", async () => {
    const zip = new JSZip();
    zip.file("dir/test.json", "Hello World\n");
    zip.file("dir/test2.json", "Hello World 2\n");
    zip.file("dir/subdir/test3.json", "Hello World 3\n");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([zipBlob], "test.zip");

    const fileMap = await zipToFileMap(zipFile);
    expect(fileMap).toEqual({
      // eslint-disable-next-line
      "test.json": expect.any(File),
      // eslint-disable-next-line
      "test2.json": expect.any(File),
      // eslint-disable-next-line
      "subdir/test3.json": expect.any(File),
    });
  });

  it("strips multiple nested empty containing directories", async () => {
    const zip = new JSZip();
    zip.file("dir/subdir1/subdir2/subdir3/test.json", "Hello World\n");
    zip.file("dir/subdir1/subdir2/subdir3/test2.json", "Hello World 2\n");
    zip.file("dir/subdir1/subdir2/subdir3/subdir4/test3.json", "Hello World 3\n");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([zipBlob], "test.zip");

    const fileMap = await zipToFileMap(zipFile);
    expect(fileMap).toEqual({
      // eslint-disable-next-line
      "test.json": expect.any(File),
      // eslint-disable-next-line
      "test2.json": expect.any(File),
      // eslint-disable-next-line
      "subdir4/test3.json": expect.any(File),
    });
  });

  it("only strips prefixes at directory level", async () => {
    const zip = new JSZip();
    zip.file("dir/subdirA/test.json", "Hello World\n");
    zip.file("dir/subdirB/test2.json", "Hello World 2\n");
    zip.file("dir/subdirC/test3.json", "Hello World 3\n");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([zipBlob], "test.zip");
    const fileMap = await zipToFileMap(zipFile);
    expect(fileMap).toEqual({
      // eslint-disable-next-line
      "subdirA/test.json": expect.any(File),
      // eslint-disable-next-line
      "subdirB/test2.json": expect.any(File),
      // eslint-disable-next-line
      "subdirC/test3.json": expect.any(File),
    });
  });

  it("keeps file in path when there is only a single file", async () => {
    const zip = new JSZip();
    zip.file("dir/subdirA/test.json", "Hello World\n");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([zipBlob], "test.zip");
    const fileMap = await zipToFileMap(zipFile);
    expect(fileMap).toEqual({
      // eslint-disable-next-line
      "test.json": expect.any(File),
    });
  });
});
