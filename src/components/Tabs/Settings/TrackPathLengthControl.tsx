import React, { ReactElement, ReactNode } from "react";
import styled from "styled-components";

import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRowAlignCenter } from "src/styles/utils";

type TrackPathLengthControlProps = {
  id: string;
};

const PastFutureLabels = styled(FlexRowAlignCenter)`
  position: absolute;
  top: -10px;
  justify-content: center;
  width: calc(100%);
  // Fudge number to get the labels centered between the sliders
  padding-left: 6px;
  gap: 5px;
  & p {
    font-size: var(--font-size-label-small);
    color: var(--color-text-secondary);
  }
`;

/**
 * Control for adjusting the length of track paths shown in the viewer. Shown
 * as two sliders extending left and right from a center point.
 */
export default function TrackPathLengthControl(props: TrackPathLengthControlProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const track = useViewerStateStore((state) => state.track);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);

  const maxTrackLength = dataset?.getMaxTrackLength() ?? 1;
  const trackStepMax = maxTrackLength;

  const futureAvailableSteps = track ? track.duration() - (currentFrame - track.startTime()) - 1 : 0;
  const pastAvailableSteps = track ? currentFrame - track.startTime() : 0;

  const trackPathPastSteps = useViewerStateStore((state) => state.trackPathPastSteps);
  const trackPathFutureSteps = useViewerStateStore((state) => state.trackPathFutureSteps);
  const setTrackPathPastSteps = useViewerStateStore((state) => state.setTrackPathPastSteps);
  const setTrackPathFutureSteps = useViewerStateStore((state) => state.setTrackPathFutureSteps);

  const handlePastStepsChange = (value: number) => {
    // value == trackStepMax => set to Infinity to show full past track
    if (value == trackStepMax) {
      setTrackPathPastSteps(Infinity);
    } else {
      setTrackPathPastSteps(Math.max(0, value));
    }
  };

  const handleFutureStepsChange = (value: number) => {
    // value == trackStepMax => set to Infinity to show full future track
    if (value == trackStepMax) {
      setTrackPathFutureSteps(Infinity);
    } else {
      setTrackPathFutureSteps(Math.max(0, value));
    }
  };

  const pathLengthTooltipFormatter = (value?: number): ReactNode => {
    if (value === undefined) {
      return null;
    } else if (value === trackStepMax) {
      return "All";
    }
    return value.toString();
  };

  return (
    <FlexColumn style={{ alignItems: "flex-start", width: "fit-content", position: "relative" }}>
      <PastFutureLabels>
        <p>Past</p>
        <p>|</p>
        <p>Future</p>
      </PastFutureLabels>
      <FlexRowAlignCenter>
        <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
            id={props.id}
            type="value"
            minSliderBound={0}
            maxSliderBound={trackStepMax}
            maxSliderLabel={`${trackStepMax - 1}`}
            minInputBound={0}
            maxInputBound={10000}
            value={trackPathPastSteps}
            onChange={handlePastStepsChange}
            step={1}
            reverse={true}
            inputPlaceholder="All"
            tooltipFormatter={pathLengthTooltipFormatter}
            marks={track ? [pastAvailableSteps] : undefined}
          />
        </div>
        <div
          style={{
            maxWidth: MAX_SETTINGS_SLIDER_WIDTH,
            width: "100%",
            position: "relative",
            height: "var(--button-height)",
            marginLeft: "10px",
          }}
        >
          <LabeledSlider
            type="value"
            minSliderBound={0}
            maxSliderBound={trackStepMax}
            maxSliderLabel={`${trackStepMax - 1}`}
            minInputBound={0}
            maxInputBound={10000}
            value={trackPathFutureSteps}
            onChange={handleFutureStepsChange}
            step={1}
            inputPosition="right"
            inputPlaceholder="All"
            tooltipFormatter={pathLengthTooltipFormatter}
            marks={track ? [futureAvailableSteps] : undefined}
          />
        </div>
      </FlexRowAlignCenter>
    </FlexColumn>
  );
}
