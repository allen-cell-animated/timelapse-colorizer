import { CaretRightOutlined, PauseOutlined, StepBackwardFilled, StepForwardFilled } from "@ant-design/icons";
import { Slider } from "antd";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { useDebounce } from "../../colorizer/utils/react_utils";
import { DEFAULT_PLAYBACK_FPS } from "../../constants";
import { useViewerStateStore } from "../../state";
import { FlexRowAlignCenter } from "../../styles/utils";

import IconButton from "../IconButton";
import PlaybackSpeedControl from "../PlaybackSpeedControl";
import SpinBox from "../SpinBox";

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

export default function PlaybackControl(props: PlaybackControlProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const [playbackFps, setPlaybackFps] = useState(DEFAULT_PLAYBACK_FPS);
  /** The frame selected by the time UI. Changes to frameInput are reflected in
   * canvas after a short delay.
   */
  const [frameInput, setFrameInput] = useState(0);

  // Flag indicating that frameInput should not be synced with playback.
  const [isUserDirectlyControllingFrameInput, setIsUserDirectlyControllingFrameInput] = useState(false);

  const timeSliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timeControls.isPlaying()) {
      setIsUserDirectlyControllingFrameInput(false);
    }
  }, [timeControls.isPlaying()]);

  // Sync the time slider with the pending frame.
  useEffect(() => {
    // When user is controlling time slider, do not sync frame input w/ playback
    if (!isUserDirectlyControllingFrameInput) {
      return useViewerStateStore.subscribe((state) => state.pendingFrame, setFrameInput);
    }
    return;
  }, [isUserDirectlyControllingFrameInput]);

  // Store the current value of the time slider as its own state, and update
  // the frame using a debounced value to prevent constant updates as it moves.
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
      if (isUserDirectlyControllingFrameInput) {
        await setFrame(frameInput);
        timeControls.play();
        // Update the frame and unpause playback when the slider is released.
        setIsUserDirectlyControllingFrameInput(false);
      }
    };

    document.addEventListener("pointerup", checkIfPlaybackShouldUnpause);
    return () => {
      document.removeEventListener("pointerup", checkIfPlaybackShouldUnpause);
    };
  }, [isUserDirectlyControllingFrameInput, frameInput]);

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

  //// Rendering ////

  return (
    <FlexRowAlignCenter $gap={4} style={{ flexWrap: "wrap" }}>
      {timeControls.isPlaying() || isUserDirectlyControllingFrameInput ? (
        // Swap between play and pause button
        <IconButton
          type="primary"
          disabled={props.disabled}
          onClick={() => {
            timeControls.pause();
            setFrameInput(currentFrame);
          }}
        >
          <PauseOutlined />
        </IconButton>
      ) : (
        <IconButton type="primary" disabled={props.disabled} onClick={() => timeControls.play()}>
          <CaretRightOutlined />
        </IconButton>
      )}

      <TimeSliderContainer
        ref={timeSliderContainerRef}
        onPointerDownCapture={() => {
          if (timeControls.isPlaying()) {
            // If the slider is dragged while playing, pause playback.
            timeControls.pause();
            setIsUserDirectlyControllingFrameInput(true);
          }
        }}
      >
        <Slider
          min={0}
          max={dataset ? dataset.numberOfFrames - 1 : 0}
          disabled={props.disabled}
          value={frameInput}
          onChange={(value) => {
            setFrameInput(value);
          }}
        />
      </TimeSliderContainer>

      <IconButton disabled={props.disabled} onClick={() => timeControls.advanceFrame(-1)} type="outlined">
        <StepBackwardFilled />
      </IconButton>
      <IconButton disabled={props.disabled} onClick={() => timeControls.advanceFrame(1)} type="outlined">
        <StepForwardFilled />
      </IconButton>

      <SpinBox
        min={0}
        max={dataset?.numberOfFrames && dataset?.numberOfFrames - 1}
        value={frameInput}
        onChange={setFrame}
        disabled={props.disabled}
        wrapIncrement={true}
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
