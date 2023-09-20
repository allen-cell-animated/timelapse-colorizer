import { Button, Modal, Input, Radio, Space, RadioChangeEvent, InputNumber, App } from "antd";
import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import SpinBox from "./SpinBox";
import { RecordingOptions } from "../colorizer/RecordingControls";

type ExportButtonProps = {
  totalFrames: number;
  setFrame: (frame: number) => void;
  currentFrame: number;
  startRecording: (options: Partial<RecordingOptions>) => void;
  stopRecording: () => void;
  defaultImagePrefix?: string;
  disabled?: boolean;
};

export const EXPORT_BUTTON_TEST_ID = "export-action";

const defaultProps: Partial<ExportButtonProps> = {
  defaultImagePrefix: "image",
  disabled: false,
};

const HorizontalDiv = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
`;

const VerticalDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CustomRangeDiv = styled(HorizontalDiv)`
  & input {
    width: 70px;
    text-align: right;
  }
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(value, min));
}

export default function ExportButton(inputProps: ExportButtonProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ExportButtonProps>;

  const enum ExportMode {
    ALL,
    CURRENT,
    CUSTOM,
  }

  const modalContextRef = useRef<HTMLDivElement>(null);

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const [exportMode, setExportMode] = useState(ExportMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(props.totalFrames - 1);
  const [imagePrefix, setImagePrefix] = useState(props.defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);
  const [frameSkip, setFrameSkip] = useState(0);

  const [originalFrame, setOriginalFrame] = useState(0);

  // Static convenience method for creating simple modals. Used here for the cancel modal.
  const { modal } = App.useApp();

  useEffect(() => {
    setCustomMax(props.totalFrames - 1);
  }, [props.totalFrames]);

  useEffect(() => {
    if (useDefaultImagePrefix) {
      setImagePrefix(props.defaultImagePrefix);
    }
  }, [props.defaultImagePrefix, useDefaultImagePrefix]);

  // Close the modal and stop any ongoing recordings.
  const onRecordingFinished = useCallback(() => {
    // Reset the frame number (clean up!)
    props.setFrame(originalFrame);
    setIsRecording(false);
    setIsLoadModalOpen(false);
  }, [originalFrame]);

  /**
   * Triggered when the user attempts to cancel or exit the main modal.
   */
  const handleCancel = useCallback(() => {
    // Not recording; exit
    if (!isRecording) {
      setIsLoadModalOpen(false);
      return;
    }

    // Currently recording; user must be prompted to confirm
    modal.confirm({
      title: "Cancel export",
      content: "Are you sure you want to cancel and exit?",
      okText: "Cancel",
      cancelText: "Back",
      centered: true,
      icon: null,
      getContainer: modalContextRef.current || undefined,
      onOk() {
        props.stopRecording();
        onRecordingFinished();
      },
    });
  }, [isRecording, modalContextRef.current, onRecordingFinished, props.stopRecording]);

  /**
   * Handle the user pressing the Export button and starting a recording
   */
  const handleStartExport = useCallback(() => {
    if (isRecording) {
      return;
    }

    // Store the frame to return to when the operations have finished.
    setOriginalFrame(props.currentFrame);

    /** Min and max are both inclusive */
    let min: number, max: number;
    switch (exportMode) {
      case ExportMode.ALL:
        min = 0;
        max = props.totalFrames - 1;
        break;
      case ExportMode.CURRENT:
        min = props.currentFrame;
        max = props.currentFrame;
        break;
      case ExportMode.CUSTOM:
        // Clamp range values in case of unsafe input
        min = clamp(customMin, 0, props.totalFrames - 1);
        max = clamp(customMax, min, props.totalFrames - 1);
    }

    // Start the recording
    setIsRecording(true);
    props.startRecording({ min: min, max: max, prefix: imagePrefix, onCompletedCallback: onRecordingFinished });
  }, [props.setFrame, isRecording, customMin, customMax, exportMode, onRecordingFinished]);

  const numExportedFrames = Math.max(Math.floor((customMax - customMin + 1) / (frameSkip + 1)), 1);

  return (
    <div ref={modalContextRef}>
      <Button type="primary" onClick={() => setIsLoadModalOpen(true)}>
        Export
      </Button>
      {/* Main Export modal */}
      <Modal
        title={"Export image sequence"}
        open={isLoadModalOpen}
        okText={isRecording ? "Stop" : "Export"}
        okButtonProps={{ "data-testid": EXPORT_BUTTON_TEST_ID }}
        onOk={isRecording ? handleCancel : handleStartExport}
        onCancel={handleCancel}
        cancelButtonProps={{ hidden: true }}
        centered={true}
        // TODO: Add custom footer instead of ok/cancel buttons
        getContainer={modalContextRef.current || undefined}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px" }}>
          <Radio.Group
            value={exportMode}
            onChange={(e: RadioChangeEvent) => {
              setExportMode(e.target.value);
            }}
            disabled={isRecording}
          >
            <Space direction="vertical">
              <Radio value={ExportMode.ALL}>All frames</Radio>
              <Radio value={ExportMode.CURRENT}>Current frame only</Radio>
              <Radio value={ExportMode.CUSTOM}>Custom</Radio>
              {exportMode === ExportMode.CUSTOM ? (
                // Render the custom range input in the radio list if selected
                <VerticalDiv style={{ paddingLeft: "25px" }}>
                  <CustomRangeDiv>
                    <p>Range:</p>
                    <InputNumber
                      aria-label="min frame"
                      controls={false}
                      min={0}
                      max={props.totalFrames - 1}
                      value={customMin}
                      onChange={(value) => value && setCustomMin(value)}
                      disabled={isRecording}
                    />
                    <p>-</p>
                    <InputNumber
                      aria-label="max frame"
                      controls={false}
                      min={customMin}
                      max={props.totalFrames - 1}
                      value={customMax}
                      onChange={(value) => value && setCustomMax(value)}
                      disabled={isRecording}
                    />
                    <p>of {props.totalFrames - 1}</p>
                  </CustomRangeDiv>
                  <HorizontalDiv>
                    <p>Frame Skip:</p>
                    <SpinBox value={frameSkip} onChange={setFrameSkip} min={0} max={props.totalFrames} />
                    <p style={{ color: "var(--color-text-secondary)" }}>({numExportedFrames} frames)</p>
                  </HorizontalDiv>
                </VerticalDiv>
              ) : null}
            </Space>
          </Radio.Group>

          <div>
            <p>Helpful tips:</p>
            <div style={{ paddingLeft: "4px" }}>
              <p>1. Set your default download location </p>
              <p>2. Turn off "Ask where to save each file before downloading" in your browser settings</p>
            </div>
          </div>

          <HorizontalDiv>
            <label style={{ width: "100%" }}>
              <p>Prefix:</p>
              <Input
                onChange={(event) => {
                  setImagePrefix(event.target.value);
                  setUseDefaultImagePrefix(false);
                }}
                size="small"
                value={imagePrefix}
                disabled={isRecording}
              />
            </label>
            <p>#.png</p>
            <Button
              disabled={isRecording}
              onClick={() => {
                setUseDefaultImagePrefix(true);
              }}
            >
              Reset
            </Button>
          </HorizontalDiv>
        </div>
      </Modal>
    </div>
  );
}

/**
 * <div>
          <p>CHANGE BROWSER DOWNLOAD SETTINGS BEFORE USE:</p>
          <p>1) Set your default download location</p>
          <p>2) Turn off 'Ask where to save each file before downloading'</p>
          <br />
          <p>Save image sequence:</p>
          <button
            onClick={() => recordingControls.start(getImagePrefix(), startAtFirstFrame)}
            disabled={recordingControls.isRecording() || timeControls.isPlaying()}
          >
            Start
          </button>
          <button onClick={() => recordingControls.abort()} disabled={!recordingControls.isRecording()}>
            Abort
          </button>
          <p>
            <label>
              Image prefix:
              <input
                value={getImagePrefix()}
                onChange={(event) => {
                  // TODO: Check for illegal characters
                  setImagePrefix(event.target.value);
                }}
              />
            </label>
            <button
              onClick={() => {
                setImagePrefix(null);
              }}
            >
              Use default prefix
            </button>
          </p>
          <p>
            <label>
              <input
                type="checkbox"
                checked={startAtFirstFrame}
                onChange={() => {
                  setStartAtFirstFrame(!startAtFirstFrame);
                }}
              />
              Start at first frame
            </label>
          </p>
        </div>
 */
