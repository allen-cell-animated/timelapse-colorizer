import { fireEvent, render, screen } from "@testing-library/react";
import React, { type ReactElement } from "react";
import { Vector2 } from "three";
import { describe, expect, it, vi } from "vitest";

import type CanvasOverlay from "src/colorizer/viewport/CanvasOverlay";
import Export from "src/components/Export";

const mockCanvas = {
  resolution: new Vector2(100, 100),
  getExportDimensions: () => new Vector2(100, 100),
} as unknown as CanvasOverlay;

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
          canvas={mockCanvas}
          currentFrame={0}
          onClick={vi.fn()}
          setIsRecording={vi.fn()}
          disabled={false}
        />
      );
    }

    it("updates default image prefix with props", () => {
      const { rerender } = render(makeExportButtonWithImagePrefix("prefix-1"));
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal

      const prefixInput: HTMLInputElement = screen.getByLabelText(/[fF]ilename/);
      expect(prefixInput.value.startsWith("prefix-1-")).toBe(true);

      rerender(makeExportButtonWithImagePrefix("prefix-2"));
      expect(prefixInput.value.startsWith("prefix-2-")).toBe(true);
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
