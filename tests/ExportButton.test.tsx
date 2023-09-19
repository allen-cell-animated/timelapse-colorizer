import { describe, expect, it, vi } from "vitest";
import { fireEvent, getByRole, queryByAttribute, queryByText, render, screen } from "@testing-library/react";
import { ReactElement } from "react";
import ExportButton, { EXPORT_BUTTON_TEST_ID } from "../src/components/ExportButton";
import React from "react";

describe("ExportButton", () => {
  describe("Image Prefixing", () => {
    function makeExportButtonWithImagePrefix(prefix: string): ReactElement {
      return (
        <ExportButton
          defaultImagePrefix={prefix}
          totalFrames={0}
          setFrame={function (frame: number): void {
            throw new Error("Function not implemented.");
          }}
          currentFrame={0}
          startRecording={function (min: number, max: number, prefix: string): void {
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
    const setupTest = (totalFrames: number, startingFrame: number) => {
      const mockStartRecording = vi.fn();
      const mockSetFrame = vi.fn();
      const mockStopRecording = vi.fn();

      const { rerender } = render(
        <ExportButton
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
    const openModal = () => {
      const exportButton = screen.getByRole("button");
      fireEvent.click(exportButton); // open modal
    };

    const pressExport = () => {
      fireEvent.click(screen.getByTestId(EXPORT_BUTTON_TEST_ID));
    };

    it("records all frames", () => {
      const totalFrames = 90;
      const { mockStartRecording, mockSetFrame } = setupTest(totalFrames, 0);

      openModal();
      const allFramesRadio: HTMLInputElement = screen.getByLabelText("All frames");
      fireEvent.click(allFramesRadio);
      pressExport();

      // Should reset frame number to 0
      expect(mockSetFrame.mock.calls.length).to.equal(1);
      expect(mockSetFrame.mock.calls[0]).to.deep.equal([0]);

      // Start Recording action should be called for whole range
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0]).equals(0);
      expect(mockStartRecording.mock.calls[0][1]).equals(totalFrames - 1);
    });

    it("can export single frame", () => {
      const totalFrames = 900;
      const currentFrame = 434;
      const { mockStartRecording, mockSetFrame } = setupTest(totalFrames, currentFrame);

      openModal();
      const currentFrameRadio: HTMLInputElement = screen.getByLabelText(/^Current frame*/);
      fireEvent.click(currentFrameRadio);
      pressExport();

      // Should reset frame number to current frame only
      expect(mockSetFrame.mock.calls.length).to.equal(1);
      expect(mockSetFrame.mock.calls[0]).to.deep.equal([currentFrame]);

      // Start Recording action should be called only for current frame
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0]).equals(currentFrame);
      expect(mockStartRecording.mock.calls[0][1]).equals(currentFrame);
    });

    it("can set custom frame range", () => {
      const totalFrames = 500;
      const currentFrame = 434;
      const { mockStartRecording, mockSetFrame } = setupTest(totalFrames, currentFrame);

      openModal();
      const currentFrameRadio: HTMLInputElement = screen.getByLabelText(/^Custom*/);
      fireEvent.click(currentFrameRadio);
      //Set ranges on the inputs
      fireEvent.input(screen.getByLabelText("min frame"), { target: { value: 25 } });
      fireEvent.input(screen.getByLabelText("max frame"), { target: { value: 468 } });
      pressExport();

      // Should reset frame number to current frame only
      expect(mockSetFrame.mock.calls.length).to.equal(1);
      expect(mockSetFrame.mock.calls[0]).to.deep.equal([25]);

      // Start Recording action should be called only for current frame
      expect(mockStartRecording.mock.calls.length).to.equal(1);
      expect(mockStartRecording.mock.calls[0][0]).equals(25);
      expect(mockStartRecording.mock.calls[0][1]).equals(468);
    });

    it("can stop recording", () => {
      const { mockStopRecording } = setupTest(10, 0);
      openModal();
      pressExport();
      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getAllByText("Cancel")[1]);
      expect(mockStopRecording.mock.calls.length).to.equal(1);

      // Expect all modals to be hidden
      const modal = document.getElementsByClassName("ant-modal-wrap");
      for (let i = 0; i < modal.length; i++) {
        const el = modal.item(i);
        if (el) {
          const style = getComputedStyle(el);
          expect(style.display).to.equal("none");
        }
      }
    });
  });
});
