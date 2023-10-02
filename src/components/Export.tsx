import { Button, Modal, Input, Radio, Space, RadioChangeEvent, InputNumber, App, Progress, Tooltip } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import SpinBox from "./SpinBox";
import { RecordingOptions } from "../colorizer/RecordingControls";
import { AppThemeContext } from "./AppStyle";
import { CheckCircleOutlined } from "@ant-design/icons";

type ExportButtonProps = {
  totalFrames: number;
  setFrame: (frame: number) => Promise<void>;
  getRenderedImage: () => string;
  currentFrame: number;
  defaultImagePrefix?: string;
  disabled?: boolean;
};

export const TEST_ID_EXPORT_ACTION_BUTTON = "export-action";
export const TEST_ID_OPEN_EXPORT_MODAL_BUTTON = "open-export-modal";

const defaultProps: Partial<ExportButtonProps> = {
  defaultImagePrefix: "image",
  disabled: false,
};

const HorizontalDiv = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  flex-wrap: wrap;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(value, min));
}

/**
 * A single Export button that opens up an export modal when clicked. Manages starting and stopping
 * an image sequence recording, resetting state when complete.
 */
export default function Export(inputProps: ExportButtonProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ExportButtonProps>;

  const theme = useContext(AppThemeContext);

  const enum ExportMode {
    ALL,
    CURRENT,
    CUSTOM,
  }

  // Static convenience method for creating simple modals + notifications.
  // Used here for the cancel modal and the success notification.
  // Note: notification API seems to only place notifications at the top-level under the
  // <body> tag, which causes some issues with styling.
  const { modal, notification } = App.useApp();
  const modalContextRef = useRef<HTMLDivElement>(null);

  const originalFrameRef = useRef(props.currentFrame);
  const [isLoadModalOpen, _setIsLoadModalOpen] = useState(false);
  // Override setIsLoadModalOpen to store the current frame whenever the modal opens.
  // This is so we can reset to it when the modal is closed.
  const setIsLoadModalOpen = (isOpen: boolean): void => {
    if (isOpen) {
      originalFrameRef.current = props.currentFrame;
    }
    _setIsLoadModalOpen(isOpen);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] = useState(false);

  const [exportMode, setExportMode] = useState(ExportMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(props.totalFrames - 1);
  const [imagePrefix, setImagePrefix] = useState(props.defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);
  const [frameIncrement, setFrameIncrement] = useState(1);

  const [percentComplete, setPercentComplete] = useState(0);

  // If dataset changes, update the max range field with the total frames.
  useEffect(() => {
    setCustomMax(props.totalFrames - 1);
  }, [props.totalFrames]);

  const getImagePrefix = (): string => (useDefaultImagePrefix ? props.defaultImagePrefix : imagePrefix);

  /** Stop any ongoing recordings and reset the current frame, optionally closing the modal. */
  const stopRecording = useCallback(
    (closeModal: boolean) => {
      props.stopRecording();
      // Reset the frame number (clean up!)
      props.setFrame(originalFrameRef.current);
      setIsRecording(false);
      setIsPlayingCloseAnimation(false);
      setPercentComplete(0);
      if (closeModal) {
        setIsLoadModalOpen(false);
      }
    },
    [props.stopRecording]
  );

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
      onOk: () => {
        stopRecording(true);
      },
    });
  }, [isRecording, modalContextRef.current, stopRecording]);

  /**
   * Stop the recording without closing the modal.
   */
  const handleStop = useCallback(() => {
    stopRecording(false);
  }, [stopRecording]);

  // Note: This is not wrapped in a useCallback because it has a large number
  // of dependencies, and is likely to update whenever ANY prop or input changes.
  /**
   * Handle the user pressing the Export button and starting a recording.
   */
  const handleStartExport = (): void => {
    if (isRecording) {
      return;
    }
    setIsRecording(true);

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
    props.startRecording({
      min: min,
      max: max,
      prefix: getImagePrefix(),
      minDigits: (props.totalFrames - 1).toString().length,
      frameIncrement: frameIncrement,
      onCompleted: async () => {
        // Close modal once recording finishes and show completion notification
        setPercentComplete(100);
        notification.success({
          message: "Export complete.",
          placement: "bottomLeft",
          duration: 4,
          icon: <CheckCircleOutlined style={{ color: theme.color.text.success }} />,
        });
        // Close the modal after a small delay so the success notification can be seen
        setIsPlayingCloseAnimation(true);
        setTimeout(() => stopRecording(true), 750);
      },
      onRecordedFrame: (frame: number) => {
        // Update the progress bar as frames are recorded.
        setPercentComplete(Math.floor(((frame - min) / (max - min)) * 100));
      },
    });
  };

  const numExportedFrames = Math.max(Math.ceil((customMax - customMin + 1) / frameIncrement), 1);

  return (
    <div ref={modalContextRef}>
      {/* Export button */}
      <Button
        type="primary"
        onClick={() => setIsLoadModalOpen(true)}
        disabled={props.disabled}
        data-testid={TEST_ID_OPEN_EXPORT_MODAL_BUTTON}
      >
        Export
      </Button>

      {/* Export modal */}
      <Modal
        title={"Export image sequence"}
        open={isLoadModalOpen}
        onCancel={handleCancel}
        cancelButtonProps={{ hidden: true }}
        centered={true}
        // Don't allow cancellation of modal by clicking off it when the recording is happening
        maskClosable={!isRecording}
        getContainer={modalContextRef.current || undefined}
        footer={
          // Layout: Optional Progress meter - Export/Stop Button - Cancel Button
          <HorizontalDiv style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
            {(percentComplete !== 0 || isRecording) && (
              <Tooltip title={percentComplete + "%"} style={{ verticalAlign: "middle" }}>
                <Progress
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                  type="circle"
                  size={theme.controls.heightSmall - 6}
                  percent={percentComplete}
                  showInfo={false}
                  strokeColor={percentComplete === 100 ? theme.color.text.success : theme.color.theme}
                  strokeWidth={12}
                />
              </Tooltip>
            )}
            <Button
              type={isRecording ? "default" : "primary"}
              onClick={isRecording ? handleStop : handleStartExport}
              data-testid={TEST_ID_EXPORT_ACTION_BUTTON}
              style={{ width: "76px" }}
              disabled={isPlayingCloseAnimation}
            >
              {isRecording ? "Stop" : "Export"}
            </Button>
            <Button onClick={handleCancel} style={{ width: "76px" }} disabled={isPlayingCloseAnimation}>
              {isRecording ? "Cancel" : "Close"}
            </Button>
          </HorizontalDiv>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px" }}>
          {/* Radio options (All/Current Frame/Custom) */}

          <Radio.Group
            value={exportMode}
            onChange={(e: RadioChangeEvent) => {
              setExportMode(e.target.value);
            }}
            disabled={isRecording}
          >
            <Space direction="vertical">
              <Radio value={ExportMode.ALL}>
                All frames{" "}
                {exportMode === ExportMode.ALL && (
                  <span style={{ color: theme.color.text.hint, marginLeft: "4px" }}>
                    ({props.totalFrames} frames total)
                  </span>
                )}
              </Radio>
              <Radio value={ExportMode.CURRENT}>Current frame only</Radio>
              <Radio value={ExportMode.CUSTOM}>Custom range</Radio>

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
                    <p>Frame Increment:</p>
                    <SpinBox value={frameIncrement} onChange={setFrameIncrement} min={1} max={props.totalFrames - 1} />
                    <p style={{ color: theme.color.text.hint }}>({numExportedFrames} frames total)</p>
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

          {/* Filename prefix */}
          <HorizontalDiv style={{ flexWrap: "nowrap" }}>
            <label style={{ width: "100%" }}>
              <p>Prefix:</p>
              <Input
                onChange={(event) => {
                  setImagePrefix(event.target.value);
                  setUseDefaultImagePrefix(false);
                }}
                size="small"
                value={getImagePrefix()}
                disabled={isRecording}
              />
            </label>
            <p>#.png</p>
            <Button
              disabled={isRecording || useDefaultImagePrefix}
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
