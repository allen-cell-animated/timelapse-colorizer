import { Checkbox, Tooltip } from "antd";
import React, { type ReactElement, ReactNode } from "react";
import styled from "styled-components";

import { TrackPathColorMode } from "src/colorizer";
import DropdownWithColorPicker from "src/components/Dropdowns/DropdownWithColorPicker";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";

import { DEFAULT_OUTLINE_COLOR_PRESETS, SETTINGS_GAP_PX } from "./constants";

const enum TrackPathSettingsHtmlIds {
  TRACK_PATH_COLOR_SELECT = "track-path-color-select",
  TRACK_PATH_WIDTH_SLIDER = "track-path-width-slider",
  TRACK_PATH_SHOW_BREAKS_CHECKBOX = "track-path-show-breaks-checkbox",
  TRACK_PATH_PAST_STEPS_SLIDER = "track-path-past-steps-slider",
  TRACK_PATH_FUTURE_STEPS_SLIDER = "track-path-future-steps-slider",
}

const TRACK_MODE_ITEMS: SelectItem[] = [
  { value: TrackPathColorMode.USE_OUTLINE_COLOR.toString(), label: "Highlight" },
  { value: TrackPathColorMode.USE_CUSTOM_COLOR.toString(), label: "Custom" },
  { value: TrackPathColorMode.USE_FEATURE_COLOR.toString(), label: "Feature" },
];

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

export default function TrackPathSettings(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const track = useViewerStateStore((state) => state.track);
  const maxTrackLength = dataset?.getMaxTrackLength() ?? 1;
  const trackStepMax = track ? track.duration() : maxTrackLength;

  const showTrackPath = useViewerStateStore((state) => state.showTrackPath);
  const showTrackPathBreaks = useViewerStateStore((state) => state.showTrackPathBreaks);
  const trackPathColor = useViewerStateStore((state) => state.trackPathColor);
  const trackPathColorMode = useViewerStateStore((state) => state.trackPathColorMode);
  const trackPathWidthPx = useViewerStateStore((state) => state.trackPathWidthPx);
  const trackPathPastSteps = useViewerStateStore((state) => state.trackPathPastSteps);
  const trackPathFutureSteps = useViewerStateStore((state) => state.trackPathFutureSteps);
  const setShowTrackPath = useViewerStateStore((state) => state.setShowTrackPath);
  const setTrackPathColor = useViewerStateStore((state) => state.setTrackPathColor);
  const setTrackPathColorMode = useViewerStateStore((state) => state.setTrackPathColorMode);
  const setTrackPathWidthPx = useViewerStateStore((state) => state.setTrackPathWidthPx);
  const setShowTrackPathBreaks = useViewerStateStore((state) => state.setShowTrackPathBreaks);
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
    <ToggleCollapse toggleChecked={showTrackPath} label="Track path" onToggleChange={setShowTrackPath}>
      <SettingsContainer gapPx={SETTINGS_GAP_PX}>
        <SettingsItem label="Color" htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={TrackPathSettingsHtmlIds.TRACK_PATH_COLOR_SELECT}
            selected={trackPathColorMode.toString()}
            items={TRACK_MODE_ITEMS}
            onValueChange={(value) => setTrackPathColorMode(Number.parseInt(value, 10) as TrackPathColorMode)}
            onColorChange={setTrackPathColor}
            color={trackPathColor}
            presets={DEFAULT_OUTLINE_COLOR_PRESETS}
            showColorPicker={trackPathColorMode === TrackPathColorMode.USE_CUSTOM_COLOR}
          />
        </SettingsItem>
        <SettingsItem label="Width" htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_WIDTH_SLIDER}>
          <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
            <LabeledSlider
              id={TrackPathSettingsHtmlIds.TRACK_PATH_WIDTH_SLIDER}
              type="value"
              minSliderBound={1}
              maxSliderBound={5}
              minInputBound={0}
              maxInputBound={100}
              precision={1}
              value={trackPathWidthPx}
              onChange={setTrackPathWidthPx}
              marks={[1.5]}
              step={0.1}
              numberFormatter={(value?: number) => `${value?.toFixed(1)}`}
            />
          </div>
        </SettingsItem>

        <SettingsItem
          label="Path length"
          htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_PAST_STEPS_SLIDER}
          style={{ marginTop: 10 }}
        >
          <FlexColumn style={{ alignItems: "flex-start", width: "fit-content", position: "relative" }}>
            <PastFutureLabels>
              <p>Past</p>
              <p>|</p>
              <p>Future</p>
            </PastFutureLabels>
            <FlexRowAlignCenter>
              <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
                <LabeledSlider
                  id={TrackPathSettingsHtmlIds.TRACK_PATH_PAST_STEPS_SLIDER}
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
                  id={TrackPathSettingsHtmlIds.TRACK_PATH_FUTURE_STEPS_SLIDER}
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
                />
              </div>
            </FlexRowAlignCenter>
          </FlexColumn>
        </SettingsItem>

        <SettingsItem
          label={"Show breaks"}
          htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_SHOW_BREAKS_CHECKBOX}
          labelStyle={{ height: "min-content" }}
        >
          <Tooltip
            title="Show breaks in the track path where the track is not continuous."
            placement="right"
            trigger={["focus", "hover"]}
          >
            <div style={{ width: "fit-content" }}>
              <VisuallyHidden>Show breaks in the track path where the track is not continuous.</VisuallyHidden>
              <Checkbox
                id={TrackPathSettingsHtmlIds.TRACK_PATH_SHOW_BREAKS_CHECKBOX}
                type="checkbox"
                checked={showTrackPathBreaks}
                onChange={(event) => {
                  setShowTrackPathBreaks(event.target.checked);
                }}
              ></Checkbox>
            </div>
          </Tooltip>
        </SettingsItem>
      </SettingsContainer>
    </ToggleCollapse>
  );
}
