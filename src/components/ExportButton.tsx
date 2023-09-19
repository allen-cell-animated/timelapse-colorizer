import { Button, Modal, Input, Radio, Space, RadioChangeEvent, InputNumber } from "antd";
import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

type ExportButtonProps = {
  totalFrames: number;
  setFrame: (frame: number) => void;
  currentFrame: number;
  defaultImagePrefix?: string;
  disabled?: boolean;
};

const defaultProps: Partial<ExportButtonProps> = {
  defaultImagePrefix: "image",
  disabled: false,
};

const HorizontalDiv = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const [exportMode, setExportMode] = useState(ExportMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(props.totalFrames - 1);
  const [imagePrefix, setImagePrefix] = useState(props.defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);

  useEffect(() => {
    setCustomMax(props.totalFrames - 1);
  }, [props.totalFrames]);

  useEffect(() => {
    if (useDefaultImagePrefix) {
      setImagePrefix(props.defaultImagePrefix);
    }
  }, [props.defaultImagePrefix, useDefaultImagePrefix]);

  const handleCancel = useCallback(() => {
    if (!isRecording) {
      setIsLoadModalOpen(false);
      setIsCancelModalOpen(false);
      return;
    }

    // Currently recording; user must be prompted to confirm
    setIsCancelModalOpen(true);
  }, [isRecording]);

  const onClickExport = useCallback(() => {
    if (isRecording) {
      return;
    }

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
    // props.setFrame(min);
  }, [props.setFrame, isRecording, customMin, customMax]);

  const handleCancelExport = useCallback(() => {
    // TODO: Stop recording action
    setIsRecording(false);
    setIsCancelModalOpen(false);
    setIsLoadModalOpen(false);
  }, []);

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
        okButtonProps={{ loading: isRecording }}
        onOk={onClickExport}
        onCancel={handleCancel}
        cancelButtonProps={{ hidden: true }}
        centered={true}
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
                <CustomRangeDiv>
                  <InputNumber
                    controls={false}
                    min={0}
                    max={props.totalFrames - 1}
                    value={customMin}
                    onChange={(value) => value && setCustomMin(value)}
                    disabled={isRecording}
                  />
                  <p>-</p>
                  <InputNumber
                    controls={false}
                    min={customMin}
                    max={props.totalFrames - 1}
                    value={customMax}
                    onChange={(value) => value && setCustomMax(value)}
                    disabled={isRecording}
                  />
                  <p>of {props.totalFrames - 1}</p>
                </CustomRangeDiv>
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
            <p>/</p>
            <Input
              onChange={(event) => {
                setImagePrefix(event.target.value);
                setUseDefaultImagePrefix(false);
              }}
              value={imagePrefix}
              disabled={isRecording}
            />
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
      {/* Cancel Export modal */}
      <Modal
        title={"Cancel export"}
        okText={"Cancel"}
        cancelText={"Back"}
        open={isCancelModalOpen}
        onOk={handleCancelExport}
        onCancel={() => setIsCancelModalOpen(false)}
        centered={true}
        /* Make slightly smaller than original modal */
        width={380}
        zIndex={1000}
      >
        Are you sure you want to cancel and exit?
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
