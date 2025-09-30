import { CaretRightOutlined, PauseOutlined, StepBackwardFilled, StepForwardFilled } from "@ant-design/icons";
import { Slider } from "antd";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { DEFAULT_PLAYBACK_FPS } from "@/colorizer/constants";
import IconButton from "@/components/Buttons/IconButton";
import PlaybackSpeedControl from "@/components/PlaybackSpeedControl";
import SpinBox from "@/components/SpinBox";
import { useDebounce } from "@/hooks";
import { useViewerStateStore } from "@/state";
import { FlexRowAlignCenter, VisuallyHidden } from "@/styles/utils";

const FRAME_INPUT_ID = "playback-control-frame-input";

const TimeSliderContainer = styled.div`
  width: calc(min(50vw, 300px));
  margin: 0 4px;
  height: var(--button-height);
  display: flex;
  align-items: center;

  & > div {
    width: 100%;
  }
`;

type PlaybackControlProps = {
  disabled: boolean;
};

export default function PlaybackControls(props: PlaybackControlProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const [playbackFps, setPlaybackFps] = useState(DEFAULT_PLAYBACK_FPS);
  /**
   * The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);

  // True when playback was occurring and the user interrupted it by moving the
  // time slider, causing a temporary pause state. When the slider is released,
  // playback will resume.
  const [isScrubbingDuringPlayback, setIsScrubbingDuringPlayback] = useState(false);

  const timeSliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If playback is started (via keyboard navigation or shortcuts)
    // while scrubbing, cancel the scrubbing override.
    if (timeControls.isPlaying() && isScrubbingDuringPlayback) {
      setIsScrubbingDuringPlayback(false);
    }
  }, [timeControls.isPlaying()]);

  // Set the frame slider's input value whenever a new frame is pending. Sync is
  // disabled when the user is manipulating the time slider.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (!isScrubbingDuringPlayback) {
      unsubscribe = useViewerStateStore.subscribe((state) => state.pendingFrame, setFrameInput);
    }
    return unsubscribe;
  }, [isScrubbingDuringPlayback]);

  // Load in a new frame whenever the frame input value hasn't changed for
  // 250ms. This prevents excessive frame loading when the user is dragging the
  // time slider.
  const debouncedFrameInput = useDebounce(frameInput, 250);
  useEffect(() => {
    if (!timeControls.isPlaying() && currentFrame !== debouncedFrameInput) {
      setFrame(debouncedFrameInput);
    }
    // Dependency only contains debouncedFrameInput to prevent time from jumping back
    // to old debounced values when time playback is paused.
  }, [debouncedFrameInput]);

  // When the slider is released, check if playback was occurring and resume it.
  // We need to attach the pointerup event listener to the document because it will not fire
  // if the user releases the pointer outside of the slider.
  useEffect(() => {
    const checkIfPlaybackShouldUnpause = async (event: PointerEvent): Promise<void> => {
      const target = event.target;
      if (target && timeSliderContainerRef.current?.contains(target as Node)) {
        // If the user clicked and released on the slider, update the
        // time immediately.
        await setFrame(frameInput);
      }
      if (isScrubbingDuringPlayback) {
        await setFrame(frameInput);
        timeControls.play();
        // Update the frame and unpause playback when the slider is released.
        setIsScrubbingDuringPlayback(false);
      }
    };

    document.addEventListener("pointerup", checkIfPlaybackShouldUnpause);
    return () => {
      document.removeEventListener("pointerup", checkIfPlaybackShouldUnpause);
    };
  }, [isScrubbingDuringPlayback, frameInput]);

  //// Keyboard Controls ////
  // TODO: Make this a hook?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "Left") {
        timeControls.advanceFrame(-1);
      } else if (e.key === "ArrowRight" || e.key === "Right") {
        timeControls.advanceFrame(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [timeControls]);

  // Continue to show the pause icon if the user interrupted playback to
  // manipulate the time slider, so it doesn't flicker between play/pause
  // states.
  const showPauseIcon = timeControls.isPlaying() || isScrubbingDuringPlayback;
  const onClickPlayPause = (): void => {
    if (showPauseIcon) {
      timeControls.pause();
      setFrameInput(currentFrame);
    } else {
      timeControls.play();
    }
  };

  //// Rendering ////

  return (
    <FlexRowAlignCenter $gap={4} style={{ flexWrap: "wrap" }}>
      <IconButton type="primary" disabled={props.disabled} onClick={onClickPlayPause}>
        {showPauseIcon ? <PauseOutlined alt="Pause" /> : <CaretRightOutlined alt="Play" />}
      </IconButton>
      <TimeSliderContainer
        ref={timeSliderContainerRef}
        onPointerDownCapture={() => {
          if (timeControls.isPlaying()) {
            // If the slider is dragged while playing, pause playback and mark
            // that playback was interrupted by the user.
            timeControls.pause();
            setIsScrubbingDuringPlayback(true);
          }
        }}
        // Note that pointer up behavior is handled above in an event listener
        // on the document, since `onPointerUpCapture` will only fire if the
        // mouse is still over the slider.
      >
        <Slider
          min={0}
          max={dataset ? dataset.numberOfFrames - 1 : 0}
          disabled={props.disabled}
          value={frameInput}
          onChange={setFrameInput}
        />
      </TimeSliderContainer>
      <IconButton disabled={props.disabled} onClick={() => timeControls.advanceFrame(-1)} type="outlined">
        <StepBackwardFilled alt="Step backward" />
      </IconButton>
      <IconButton disabled={props.disabled} onClick={() => timeControls.advanceFrame(1)} type="outlined">
        <StepForwardFilled alt="Step forward" />
      </IconButton>

      <VisuallyHidden>
        <label htmlFor={FRAME_INPUT_ID}>Current Frame</label>
      </VisuallyHidden>
      <SpinBox
        min={0}
        max={dataset?.numberOfFrames && dataset?.numberOfFrames - 1}
        value={frameInput}
        onChange={setFrame}
        disabled={props.disabled}
        wrapIncrement={true}
        id={FRAME_INPUT_ID}
      />

      <div style={{ display: "flex", flexDirection: "row", flexGrow: 1, justifyContent: "flex-end" }}>
        <PlaybackSpeedControl
          fps={playbackFps}
          onChange={(fps) => {
            setPlaybackFps(fps);
            timeControls.setPlaybackFps(fps);
          }}
          disabled={props.disabled}
        />
      </div>
    </FlexRowAlignCenter>
  );
}
