import { Mock, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactElement } from "react";
import { TEST_ID_EXPORT_ACTION_BUTTON, TEST_ID_OPEN_EXPORT_MODAL_BUTTON } from "../src/components/Export";
import Export from "../src/components/Export";
import React from "react";
import { RecordingOptions } from "../src/colorizer/RecordingControls";

describe("ExportButton", () => {
  describe("Image Prefixing", () => {
    function makeExportButtonWithImagePrefix(prefix: string): ReactElement {
      return (
        <Export
          defaultImagePrefix={prefix}
          totalFrames={0}
          setFrame={function (_frame: number): void {
            throw new Error("Function not implemented.");
          }}
          currentFrame={0}
          startRecording={function (_options: Partial<RecordingOptions>): void {
            throw new Error("Function not implemented.");
          }}
          stopRecording={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      );
    }

    it("updates default image prefix with props", () => {
      const { rerender } = render(makeExportButtonWithImagePrefix("prefix-1"));
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal

      const prefixInput: HTMLInputElement = screen.getByLabelText(/[pP]refix/);
      expect(prefixInput.value).to.equal("prefix-1");

      rerender(makeExportButtonWithImagePrefix("prefix-2"));
      expect(prefixInput.value).to.equal("prefix-2");
    });

    it("stops updating default image prefix when prefix is modified", () => {
      const { rerender } = render(makeExportButtonWithImagePrefix("prefix-1"));
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal

      const prefixInput: HTMLInputElement = screen.getByLabelText(/[pP]refix/);
      fireEvent.input(prefixInput, { target: { value: "my new prefix" } });
      expect(prefixInput.value).to.equal("my new prefix");

      rerender(makeExportButtonWithImagePrefix("prefix-2"));
      expect(prefixInput.value).to.equal("my new prefix");
    });
  });

  describe("Recording", () => {
    const setupTest = (
      totalFrames: number,
      startingFrame: number
    ): {
      rerender: (ui: ReactElement<any, string | React.JSXElementConstructor<any>>) => void;
      mockStartRecording: Mock;
      mockStopRecording: Mock;
      mockSetFrame: Mock;
    } => {
      const mockStartRecording = vi.fn();
      const mockSetFrame = vi.fn();
      const mockStopRecording = vi.fn();

      const { rerender } = render(
        <Export
          totalFrames={totalFrames}
          setFrame={mockSetFrame}
          currentFrame={startingFrame}
          startRecording={mockStartRecording}
          stopRecording={mockStopRecording}
        />
      );

      return {
        rerender,
        mockStartRecording,
        mockStopRecording,
        mockSetFrame,
      };
    };

    const openModal = (): void => {
      const exportButton = screen.getByTestId(TEST_ID_OPEN_EXPORT_MODAL_BUTTON);
      fireEvent.click(exportButton); // open modal
    };

    const pressExport = (): void => {
      fireEvent.click(screen.getByTestId(TEST_ID_EXPORT_ACTION_BUTTON));
    };

    it("records all frames", () => {
      const totalFrames = 90;
      const { mockStartRecording } = setupTest(totalFrames, 0);

      openModal();
      const allFramesRadio: HTMLInputElement = screen.getByLabelText(/^All frames/);
      fireEvent.click(allFramesRadio);
      pressExport();

      // Start Recording action should be called for whole range
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0].min).equals(0);
      expect(mockStartRecording.mock.calls[0][0].max).equals(totalFrames - 1);
    });

    it("can export single frame", () => {
      const totalFrames = 900;
      const currentFrame = 434;
      const { mockStartRecording } = setupTest(totalFrames, currentFrame);

      openModal();
      const currentFrameRadio: HTMLInputElement = screen.getByLabelText(/^Current frame*/);
      fireEvent.click(currentFrameRadio);
      pressExport();

      // Start Recording action should be called only for current frame
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0].min).equals(currentFrame);
      expect(mockStartRecording.mock.calls[0][0].max).equals(currentFrame);
    });

    it("can set custom frame range", () => {
      const totalFrames = 500;
      const currentFrame = 434;
      const { mockStartRecording } = setupTest(totalFrames, currentFrame);

      openModal();
      const currentFrameRadio: HTMLInputElement = screen.getByLabelText(/^Custom*/);
      fireEvent.click(currentFrameRadio);
      //Set ranges on the inputs
      fireEvent.input(screen.getByLabelText("min frame"), { target: { value: 25 } });
      fireEvent.input(screen.getByLabelText("max frame"), { target: { value: 468 } });
      pressExport();

      // Start Recording action should be called only for current frame
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0].min).equals(25);
      expect(mockStartRecording.mock.calls[0][0].max).equals(468);
    });
  });
});
