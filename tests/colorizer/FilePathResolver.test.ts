import { describe, expect, it } from "vitest";

import { FilePathResolver } from "../../src/colorizer/path_resolvers";

describe("FilePathResolver", () => {
  describe("resolve", () => {
    // TODO: Mock createObjectURL because it is not available in the test environment
    const exampleResolver = new FilePathResolver({
      "example.txt": new File(["Hello World\n"], "example.txt"),
      "dir/example.txt": new File(["Hello from a directory\n"], "dir/example.txt"),
      "dir/subdir/example.txt": new File(["Hello from a subdirectory\n"], "dir/subdir/example.txt"),
    });

    it("returns a file object URL for a given file path", () => {
      const url1 = exampleResolver.resolve("", "example.txt");
      const url2 = exampleResolver.resolve("", "dir/example.txt");
      const url3 = exampleResolver.resolve("", "dir/subdir/example.txt");
      expect(url1).to.be.a("string");
      expect(url2).to.be.a("string");
      expect(url1).not.to.equal(url2);
      expect(url3).to.be.a("string");
      expect(url2).not.to.equal(url3);
    });

    it("returns the same object URL for the same file paths", () => {
      const url1 = exampleResolver.resolve("", "example.txt");
      const url2 = exampleResolver.resolve("", "example.txt");
      expect(url1).to.equal(url2);
    });

    it("can use base path for relative pathing", () => {
      const url1 = exampleResolver.resolve("", "example.txt");
      const url2 = exampleResolver.resolve("dir", "example.txt");
      const url3 = exampleResolver.resolve("dir/subdir", "example.txt");
      expect(url1).to.be.a("string");
      expect(url2).to.be.a("string");
      expect(url1).not.to.equal(url2);
      expect(url3).to.be.a("string");
      expect(url2).not.to.equal(url3);
    });

    it("returns null when the file does not exist", () => {
      const url = exampleResolver.resolve("", "nonexistent.txt");
      expect(url).to.be.null;
    });

    it("resolves '/allen'", () => {
      const url1 = exampleResolver.resolve("", "//allen/aics/users/example");
      const url2 = exampleResolver.resolve("", "/allen/aics/users/example");
      expect(url1).to.equal("https://dev-aics-dtp-001.int.allencell.org/users/example");
      expect(url2).to.equal("https://dev-aics-dtp-001.int.allencell.org/users/example");
    });

    it("returns HTTP/HTTPS URLs as-is", () => {
      const httpUrl = exampleResolver.resolve("", "http://example.com");
      const httpsUrl = exampleResolver.resolve("", "https://example.com");
      expect(httpUrl).to.equal("http://example.com");
      expect(httpsUrl).to.equal("https://example.com");
    });
  });
});
