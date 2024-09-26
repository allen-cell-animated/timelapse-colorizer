import { fireEvent, render, screen } from "@testing-library/react";
import { ReactElement } from "react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import Export from "../src/components/Export";

describe("ExportButton", () => {
  describe("Image Prefixing", () => {
    function makeExportButtonWithImagePrefix(prefix: string): ReactElement {
      return (
        <Export
          defaultImagePrefix={prefix}
          totalFrames={0}
          setFrame={async function (_frame: number): Promise<void> {
            throw new Error("Function not implemented.");
          }}
          getCanvas={vi.fn()}
          currentFrame={0}
        />
      );
    }

    it("updates default image prefix with props", () => {
      const { rerender } = render(makeExportButtonWithImagePrefix("prefix-1"));
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal

      const prefixInput: HTMLInputElement = screen.getByLabelText(/[fF]ilename/);
      expect(prefixInput.value).to.equal("prefix-1-");

      rerender(makeExportButtonWithImagePrefix("prefix-2"));
      expect(prefixInput.value).to.equal("prefix-2-");
    });

    it("stops updating default image prefix when prefix is modified", () => {
      const { rerender } = render(makeExportButtonWithImagePrefix("prefix-1"));
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal

      const prefixInput: HTMLInputElement = screen.getByLabelText(/[fF]ilename/);
      fireEvent.input(prefixInput, { target: { value: "my new prefix" } });
      expect(prefixInput.value).to.equal("my new prefix");

      rerender(makeExportButtonWithImagePrefix("prefix-2"));
      expect(prefixInput.value).to.equal("my new prefix");
    });
  });
});
