import { CameraOutlined, CheckCircleOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Progress,
  Radio,
  RadioChangeEvent,
  Space,
  Tooltip,
} from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { clamp } from "three/src/math/MathUtils";

import { toEven } from "../colorizer/canvas/utils";
import { AnalyticsEvent, triggerAnalyticsEvent } from "../colorizer/utils/analytics";
import { DEFAULT_EXPORT_DIMENSIONS } from "../constants";
import { useViewerStateStore } from "../state";
import { StyledRadioGroup } from "../styles/components";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter } from "../styles/utils";

import { IRenderCanvas } from "../colorizer/IRenderCanvas";
import CanvasRecorder, { RecordingOptions } from "../colorizer/recorders/CanvasRecorder";
import ImageSequenceRecorder from "../colorizer/recorders/ImageSequenceRecorder";
import Mp4VideoRecorder, { VideoBitrate } from "../colorizer/recorders/Mp4VideoRecorder";
import { AppThemeContext } from "./AppStyle";
import TextButton from "./Buttons/TextButton";
import IconButton from "./IconButton";
import StyledModal, { useStyledModal } from "./Modals/StyledModal";
import { SettingsContainer, SettingsItem } from "./SettingsContainer";
import SpinBox from "./SpinBox";

type ExportButtonProps = {
  totalFrames: number;
  setFrame: (frame: number) => Promise<void>;
  getCanvasExportDimensions: () => [number, number];
  getCanvas: () => IRenderCanvas;
  /** Callback, called whenever the button is clicked. Can be used to stop playback. */
  onClick: () => void;
  currentFrame: number;
  /** Callback, called whenever the recording process starts or stops. */
  setIsRecording: (recording: boolean) => void;
  defaultImagePrefix: string;
  disabled: boolean;
};

const FRAME_RANGE_RADIO_LABEL_ID = "export-modal-frame-range-label";

const defaultProps: Partial<ExportButtonProps> = {
  setIsRecording: () => {},
  defaultImagePrefix: "image",
  disabled: false,
  onClick: () => {},
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

const CustomRadio = styled(Radio)`
  & span {
    // Clip text when the radio is too narrow
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & span:not(.ant-radio-button) {
    // Text span
    width: 100%;
    text-align: center;
  }
`;

const ExportModeRadioGroup = styled(StyledRadioGroup)`
  & {
    // Use standard 40px of padding, unless the view is too narrow and it needs to shrink
    padding: 0 calc(min(40px, 5vw));
  }
  & label {
    // Make the Radio options the same width
    flex-grow: 1;
    width: 50%;
  }
`;

/** Overrides Ant's styling so contents can take up full width */
const MaxWidthRadioGroup = styled(Radio.Group)`
  width: 100%;

  & .ant-space {
    width: 100%;
  }
`;

const VideoQualityRadioGroup = styled(StyledRadioGroup)`
  & {
    display: flex;
    flex-direction: row;
  }
`;

/**
 * A single Export button that opens up an export modal when clicked. Manages starting and stopping
 * an image sequence recording, resetting state when complete.
 */
export default function Export(inputProps: ExportButtonProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ExportButtonProps>;

  const theme = useContext(AppThemeContext);

  const enum RangeMode {
    ALL,
    CURRENT,
    CUSTOM,
  }

  const enum RecordingMode {
    IMAGE_SEQUENCE,
    VIDEO_MP4,
  }

  // Static convenience method for creating simple modals + notifications.
  // Used here for the cancel modal and the success notification.
  // Note: notification API seems to only place notifications at the top-level under the
  // <body> tag, which causes some issues with styling.
  const { notification } = App.useApp();
  const modal = useStyledModal();

  const showHeaderDuringExport = useViewerStateStore((state) => state.showHeaderDuringExport);
  const setShowHeaderDuringExport = useViewerStateStore((state) => state.setShowHeaderDuringExport);
  const showLegendDuringExport = useViewerStateStore((state) => state.showLegendDuringExport);
  const setShowLegendDuringExport = useViewerStateStore((state) => state.setShowLegendDuringExport);
  const dataset = useViewerStateStore((state) => state.dataset);

  const originalFrameRef = useRef(props.currentFrame);
  const exportModalRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const [isRecording, _setIsRecording] = useState(false);
  const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] = useState(false);

  const [recordingMode, _setRecordingMode] = useState(RecordingMode.IMAGE_SEQUENCE);
  const recorder = useRef<CanvasRecorder | null>(null);
  const [errorText, setErrorText] = useState<null | string>(null);

  // TODO: Store these settings to local storage so they persist?
  const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(props.totalFrames - 1);

  const [videoDimensionsInput, setVideoDimensionsInput] = useState(DEFAULT_EXPORT_DIMENSIONS);
  const [aspectRatio, setAspectRatio] = useState<number | null>(videoDimensionsInput[0] / videoDimensionsInput[1]);
  const videoDimensions = useMemo(() => videoDimensionsInput.map(toEven), [videoDimensionsInput]);

  const defaultImagePrefix = useMemo(() => {
    return `${props.defaultImagePrefix}-${videoDimensions[0]}x${videoDimensions[1]}`;
  }, [videoDimensions, props.defaultImagePrefix]);

  const [imagePrefix, setImagePrefix] = useState(defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);
  const [frameIncrement, setFrameIncrement] = useState(1);
  const [fps, setFps] = useState(12);
  const [videoBitsPerSecond, setVideoBitsPerSecond] = useState(VideoBitrate.MEDIUM);

  const [percentComplete, setPercentComplete] = useState(0);

  // Override setRecordingMode when switching to video; users should not choose current frame only
  // (since exporting the current frame only as a video doesn't really make sense.)
  const setRecordingMode = (mode: RecordingMode): void => {
    _setRecordingMode(mode);
    if (mode === RecordingMode.VIDEO_MP4 && rangeMode === RangeMode.CURRENT) {
      setRangeMode(RangeMode.ALL);
    }
  };

  // Override setIsLoadModalOpen to store the current frame whenever the modal opens.
  // This is so we can reset to it when the modal is closed.
  const setIsModalOpen = (isOpen: boolean): void => {
    if (isOpen) {
      originalFrameRef.current = props.currentFrame;
      setErrorText(null);
    }
    _setIsModalOpen(isOpen);
  };

  // Notify parent via props if recording state changes
  const setIsRecording = (isRecording: boolean): void => {
    props.setIsRecording(isRecording);
    _setIsRecording(isRecording);
  };

  // If dataset changes, update the max range field with the total frames.
  useEffect(() => {
    setCustomMax(props.totalFrames - 1);
  }, [props.totalFrames]);

  const getImagePrefix = (): string => {
    if (useDefaultImagePrefix) {
      if (recordingMode === RecordingMode.IMAGE_SEQUENCE) {
        // Add separator between prefix and frame number
        return defaultImagePrefix + "-";
      } else {
        return defaultImagePrefix;
      }
    } else {
      return imagePrefix;
    }
  };

  //////////////// EVENT HANDLERS ////////////////

  /** Stop any ongoing recordings and reset the current frame, optionally closing the modal. */
  const stopRecording = useCallback(
    (closeModal: boolean) => {
      recorder.current?.abort();
      // Reset the frame number (clean up!)
      props.setFrame(originalFrameRef.current);
      setIsRecording(false);
      recorder.current = null;
      setIsPlayingCloseAnimation(false);
      setPercentComplete(0);
      if (closeModal) {
        setIsModalOpen(false);
      }
    },
    [props.setFrame]
  );

  /**
   * Triggered when the user attempts to cancel or exit the main modal.
   */
  const handleCancel = useCallback(() => {
    // Not recording; exit
    if (!isRecording) {
      setIsModalOpen(false);
      return;
    }

    // TODO: Close the modal if the recording is done, but the modal is still open.
    // Currently recording; user must be prompted to confirm
    modal.confirm({
      title: "Cancel export",
      content: "Are you sure you want to cancel and exit?",
      okText: "Cancel",
      cancelText: "Back",
      centered: true,
      icon: null,
      onOk: () => {
        stopRecording(true);
      },
    });
  }, [isRecording, stopRecording]);

  /**
   * Stop the recording without closing the modal.
   */
  const handleStop = useCallback(() => {
    stopRecording(false);
    setErrorText(null);
  }, [stopRecording]);

  const handleError = useCallback((error: Error) => {
    // Stop current recording and show error message
    setErrorText(error.message);
    if (recorder.current) {
      recorder.current.abort();
    }
  }, []);

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
    setErrorText(null);

    /** Min and max are both inclusive */
    let min: number, max: number;
    switch (rangeMode) {
      case RangeMode.ALL:
        min = 0;
        max = props.totalFrames - 1;
        break;
      case RangeMode.CURRENT:
        min = props.currentFrame;
        max = props.currentFrame;
        break;
      case RangeMode.CUSTOM:
        // Clamp range values in case of unsafe input
        min = clamp(customMin, 0, props.totalFrames - 1);
        max = clamp(customMax, min, props.totalFrames - 1);
    }

    // Copy configuration to options object
    // Note that different codecs will be selected by the browser based on the canvas dimensions.
    props.getCanvas().setResolution(videoDimensions[0], videoDimensions[1]);
    const canvasDims = props.getCanvasExportDimensions();
    const recordingOptions: Partial<RecordingOptions> = {
      min: min,
      max: max,
      prefix: getImagePrefix(),
      minDigits: (props.totalFrames - 1).toString().length,
      // Disable download delay for video
      delayMs: recordingMode === RecordingMode.IMAGE_SEQUENCE ? 100 : 0,
      frameIncrement: frameIncrement,
      fps: fps,
      bitrate: videoBitsPerSecond,
      outputSize: [canvasDims[0], canvasDims[1]],
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
        triggerAnalyticsEvent(AnalyticsEvent.EXPORT_COMPLETE, {
          exportFormat: recordingMode === RecordingMode.IMAGE_SEQUENCE ? "png" : "mp4",
        });
      },
      onRecordedFrame: (frame: number) => {
        // Update the progress bar as frames are recorded.
        setPercentComplete(Math.floor(((frame - min) / (max - min)) * 100));
      },
      onError: handleError,
    };

    // Initialize different recorders based on the provided options.
    switch (recordingMode) {
      case RecordingMode.VIDEO_MP4:
        recorder.current = new Mp4VideoRecorder(props.setFrame, () => props.getCanvas().canvas, recordingOptions);
        break;
      case RecordingMode.IMAGE_SEQUENCE:
      default:
        recorder.current = new ImageSequenceRecorder(props.setFrame, () => props.getCanvas().canvas, recordingOptions);
        break;
    }
    recorder.current.start();
  };

  const handleUseImageDimensions = (): void => {
    if (!dataset) {
      return;
    }
    setVideoDimensionsInput(dataset.frameResolution.toArray());
    if (aspectRatio) {
      setAspectRatio(dataset.frameResolution.x / dataset.frameResolution.y);
    }
  };

  const handleUseViewportDimensions = (): void => {
    const canvas = props.getCanvas();
    setVideoDimensionsInput(canvas.resolution.toArray());
    if (aspectRatio) {
      setAspectRatio(canvas.resolution.x / canvas.resolution.y);
    }
  };

  const handleSetWidth = (width: number | null): void => {
    if (width !== null) {
      if (aspectRatio !== null) {
        setVideoDimensionsInput([width, toEven(width / aspectRatio)]);
      } else {
        setVideoDimensionsInput([width, videoDimensionsInput[1]]);
      }
    }
  };

  const handleSetHeight = (height: number | null): void => {
    if (height !== null) {
      if (aspectRatio !== null) {
        setVideoDimensionsInput([toEven(height * aspectRatio), height]);
      } else {
        setVideoDimensionsInput([videoDimensionsInput[0], height]);
      }
    }
  };

  //////////////// RENDERING ////////////////

  const tooltipTrigger: ("hover" | "focus")[] = ["hover", "focus"];

  const videoQualityOptions = [
    { label: "High", value: VideoBitrate.HIGH },
    { label: "Med", value: VideoBitrate.MEDIUM },
    { label: "Low", value: VideoBitrate.LOW },
  ];

  const isWebCodecsEnabled = Mp4VideoRecorder.isSupported();
  const customRangeFrames = Math.max(Math.ceil((customMax - customMin + 1) / frameIncrement), 1);

  const totalFrames = rangeMode === RangeMode.CUSTOM ? customRangeFrames : props.totalFrames;
  const totalSeconds = totalFrames / fps;

  // Gets the total duration as a MM min, SS sec label.
  // Also adds decimal places for small durations.
  const getDurationLabel = (): string => {
    const durationMin = Math.floor(totalSeconds / 60);
    const durationSec = totalSeconds - durationMin * 60;

    let timestamp = "";
    if (durationMin > 0) {
      timestamp += durationMin.toString() + " min, ";
    }
    // Format seconds to hundredths if less than 10 seconds
    if (durationMin === 0 && durationSec < 10) {
      // Round digits to 2 decimal places
      const roundedSeconds = Math.round(durationSec * 100) / 100;
      timestamp += roundedSeconds.toFixed(2) + " sec";
    } else {
      timestamp += Math.floor(durationSec).toString() + " sec";
    }
    return timestamp;
  };

  const getApproximateVideoFilesizeMb = (): string => {
    // From experimentation, filesize scales linearly (ish) with the
    // bitrate and duration unless a maximum filesize is hit at high
    // bitrates, which seems to depend on the video dimensions.

    // Video quality is bitrate in bits/second.
    // This is usually within 0.5-2x the actual filesize.
    const maxVideoBitsDuration = totalSeconds * videoBitsPerSecond;

    // Experimentally-determined compression ratio (bits per pixel), which determines
    // maximum size a video can be at very high bitrates. This may vary WILDLY based
    // on image complexity (videos with little change will compress better).
    // This is here because otherwise the filesize estimate is way too high for high bitrates
    // (475 MB predicted vs. 70 MB actual)
    // TODO: Is there a way to concretely determine this?
    const compressionRatioBitsPerPixel = 3.5; // Actual value 2.7-3.0, overshooting to be safe
    const maxVideoBitsResolution = videoDimensions[0] * videoDimensions[1] * totalFrames * compressionRatioBitsPerPixel;

    const sizeInMb = Math.min(maxVideoBitsResolution, maxVideoBitsDuration) / 8_000_000; // bits to MB

    if (sizeInMb > 1) {
      return Math.round(sizeInMb) + " MB";
    } else {
      // Round to one decimal place, with a minimum of 0.1 MB. (We don't need to be too precise
      // because these are estimates.)
      return Math.max(1, Math.round(sizeInMb * 10)) / 10 + " MB";
    }
  };

  let progressBarColor = theme.color.theme;
  if (errorText) {
    progressBarColor = theme.color.text.error;
  } else if (percentComplete === 100) {
    progressBarColor = theme.color.text.success;
  }

  // Footer for the Export modal.
  // Layout: Optional Progress meter - Export/Stop Button - Cancel Button
  const modalFooter = (
    <VerticalDiv>
      <HorizontalDiv style={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
        {(percentComplete !== 0 || isRecording) && (
          <Tooltip title={percentComplete + "%"} style={{ verticalAlign: "middle" }} trigger={tooltipTrigger}>
            <Progress
              style={{ marginRight: "8px", verticalAlign: "middle" }}
              type="circle"
              size={theme.controls.heightSmall - 6}
              percent={percentComplete}
              showInfo={false}
              strokeColor={progressBarColor}
              strokeWidth={12}
            />
          </Tooltip>
        )}
        <Button
          type={isRecording ? "default" : "primary"}
          onClick={isRecording ? handleStop : handleStartExport}
          style={{ width: "76px" }}
          disabled={isPlayingCloseAnimation}
          id={isRecording ? "export-modal-stop-button" : "export-modal-export-button"}
        >
          {isRecording ? "Stop" : "Export"}
        </Button>
        <Button onClick={handleCancel} style={{ width: "76px" }} disabled={isPlayingCloseAnimation}>
          {isRecording ? "Cancel" : "Close"}
        </Button>
      </HorizontalDiv>
      {errorText && <p style={{ color: theme.color.text.error, textAlign: "left" }}>{errorText}</p>}
    </VerticalDiv>
  );

  return (
    <div>
      {/* Export button */}
      <TextButton
        onClick={() => {
          setIsModalOpen(true);
          props.onClick();
        }}
        disabled={props.disabled}
        id="export-button"
      >
        <CameraOutlined />
        <p>Export</p>
      </TextButton>

      {/* Export modal */}
      <StyledModal
        title={"Export"}
        open={isModalOpen}
        onCancel={handleCancel}
        cancelButtonProps={{ hidden: true }}
        centered={true}
        // Don't allow cancellation of modal by clicking off it when the recording is happening
        maskClosable={!isRecording}
        footer={modalFooter}
      >
        <FlexColumn $gap={20} style={{ marginTop: "15px" }} ref={exportModalRef}>
          {/* Recording type (image/video) radio */}
          <FlexColumnAlignCenter>
            <ExportModeRadioGroup
              value={recordingMode}
              buttonStyle="solid"
              optionType="button"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                width: "100%",
              }}
              onChange={(e) => setRecordingMode(e.target.value)}
              disabled={isRecording}
            >
              <CustomRadio value={RecordingMode.IMAGE_SEQUENCE}>PNG image sequence</CustomRadio>
              {/* Optional tooltip here in case WebCodecs API is not enabled. */}
              <Tooltip
                title={"Video recording isn't supported by this browser."}
                open={isWebCodecsEnabled ? false : undefined}
                trigger={tooltipTrigger}
              >
                <CustomRadio value={RecordingMode.VIDEO_MP4} disabled={isRecording || !isWebCodecsEnabled}>
                  MP4 video
                </CustomRadio>
              </Tooltip>
            </ExportModeRadioGroup>
          </FlexColumnAlignCenter>

          {/* Range options (All/Current Frame/Custom) */}
          <Card size="small" title={<p id={FRAME_RANGE_RADIO_LABEL_ID}>Frame range</p>}>
            <MaxWidthRadioGroup
              value={rangeMode}
              onChange={(e: RadioChangeEvent) => {
                setRangeMode(e.target.value);
              }}
              disabled={isRecording}
              aria-labelledby={FRAME_RANGE_RADIO_LABEL_ID}
            >
              <Space direction="vertical">
                <Radio value={RangeMode.ALL}>
                  All frames{" "}
                  {rangeMode === RangeMode.ALL && (
                    <span style={{ color: theme.color.text.hint, marginLeft: "4px" }}>
                      ({props.totalFrames} frames total)
                    </span>
                  )}
                </Radio>
                <Radio value={RangeMode.CURRENT} disabled={isRecording || recordingMode === RecordingMode.VIDEO_MP4}>
                  Current frame only
                </Radio>
                <Radio value={RangeMode.CUSTOM}>Custom range</Radio>

                {rangeMode === RangeMode.CUSTOM ? (
                  // Render the custom range input in the radio list if selected
                  <SettingsContainer indentPx={28}>
                    <SettingsItem label="Range">
                      <HorizontalDiv>
                        <InputNumber
                          style={{ width: 60 }}
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
                          style={{ width: 60 }}
                          aria-label="max frame"
                          controls={false}
                          min={customMin}
                          max={props.totalFrames - 1}
                          value={customMax}
                          onChange={(value) => value && setCustomMax(value)}
                          disabled={isRecording}
                        />
                        <p>of {props.totalFrames - 1}</p>
                      </HorizontalDiv>
                    </SettingsItem>
                    <SettingsItem label="Frame increment">
                      <FlexRow $gap={6}>
                        <SpinBox
                          value={frameIncrement}
                          onChange={setFrameIncrement}
                          min={1}
                          max={props.totalFrames - 1}
                          disabled={isRecording}
                          width="140px"
                        />
                        <p style={{ color: theme.color.text.hint }}>({customRangeFrames} frames total)</p>
                      </FlexRow>
                    </SettingsItem>
                  </SettingsContainer>
                ) : null}
              </Space>
            </MaxWidthRadioGroup>
          </Card>

          <SettingsContainer gapPx={6}>
            {recordingMode === RecordingMode.VIDEO_MP4 && (
              <>
                <SettingsItem label="Frames per second">
                  <FlexRow $gap={6}>
                    <SpinBox value={fps} onChange={setFps} min={1} max={120} disabled={isRecording} width="175px" />
                    <p style={{ color: theme.color.text.hint }}>({getDurationLabel()})</p>
                  </FlexRow>
                </SettingsItem>
                <SettingsItem label="Video quality">
                  <FlexRow $gap={6}>
                    <VideoQualityRadioGroup
                      disabled={isRecording}
                      options={videoQualityOptions}
                      optionType="button"
                      value={videoBitsPerSecond}
                      onChange={(e) => setVideoBitsPerSecond(e.target.value)}
                    />
                    <p style={{ color: theme.color.text.hint }}>(~{getApproximateVideoFilesizeMb()})</p>
                  </FlexRow>
                </SettingsItem>
              </>
            )}
            {/* Filename prefix */}
            <SettingsItem label={"Filename"}>
              <FlexRow $gap={6}>
                <Input
                  onChange={(event) => {
                    setImagePrefix(event.target.value);
                    setUseDefaultImagePrefix(false);
                  }}
                  size="small"
                  value={getImagePrefix()}
                  disabled={isRecording}
                />
                <p>{recordingMode === RecordingMode.IMAGE_SEQUENCE ? "#.png" : ".mp4"}</p>
                <Button
                  disabled={isRecording || useDefaultImagePrefix}
                  onClick={() => {
                    setUseDefaultImagePrefix(true);
                  }}
                >
                  Reset
                </Button>
              </FlexRow>
            </SettingsItem>
            <SettingsItem label="Dimensions" labelStyle={{ marginTop: "2px", height: "min-content" }}>
              <FlexColumn style={{ alignItems: "flex-start", paddingBottom: "4px" }} $gap={6}>
                <FlexColumn>
                  <p
                    style={{
                      color: theme.color.text.hint,
                      marginBottom: 0,
                      paddingBottom: 0,
                      fontSize: theme.font.size.content,
                    }}
                  >
                    Will be rounded to the nearest even number
                  </p>
                  <FlexRowAlignCenter $gap={4}>
                    <InputNumber
                      value={videoDimensionsInput[0]}
                      onChange={handleSetWidth}
                      changeOnBlur={true}
                      controls={false}
                      style={{ width: "70px" }}
                    />
                    <span style={{ padding: "0 4px" }}>×</span>
                    <InputNumber
                      value={videoDimensionsInput[1]}
                      onChange={handleSetHeight}
                      changeOnBlur={true}
                      controls={false}
                      style={{ width: "70px" }}
                    />
                    <Tooltip
                      title={aspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                      trigger={["hover", "focus"]}
                      getPopupContainer={() => exportModalRef.current || document.body}
                    >
                      <IconButton
                        type={aspectRatio ? "primary" : "link"}
                        sizePx={26}
                        onClick={() =>
                          setAspectRatio(aspectRatio ? null : videoDimensionsInput[0] / videoDimensionsInput[1])
                        }
                      >
                        {aspectRatio ? <LockOutlined /> : <UnlockOutlined />}
                      </IconButton>
                    </Tooltip>
                  </FlexRowAlignCenter>
                </FlexColumn>
                <FlexRow $gap={6}>
                  <Button onClick={handleUseViewportDimensions}>Use viewport</Button>
                  <Button disabled={!dataset || dataset.has3dFrames()} onClick={handleUseImageDimensions}>
                    Use image
                  </Button>
                </FlexRow>
              </FlexColumn>
            </SettingsItem>
            <SettingsItem label={"Show feature legend"}>
              <Checkbox
                checked={showLegendDuringExport}
                onChange={(e) => setShowLegendDuringExport(e.target.checked)}
              />
            </SettingsItem>
            <SettingsItem label="Show dataset name">
              <div>
                <Checkbox
                  checked={showHeaderDuringExport}
                  onChange={(e) => setShowHeaderDuringExport(e.target.checked)}
                />
              </div>
            </SettingsItem>
          </SettingsContainer>

          <div>
            <p>
              <b>Recommended browser settings:</b> disable &quot;Ask where to save each file before downloading&quot;
              and set the default download location.
            </p>
          </div>
        </FlexColumn>
      </StyledModal>
    </div>
  );
}
