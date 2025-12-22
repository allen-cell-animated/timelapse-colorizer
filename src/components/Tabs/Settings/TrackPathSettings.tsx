import { Checkbox, Tooltip } from "antd";
import React, { type ReactElement, useMemo } from "react";

import { DISPLAY_COLOR_RAMP_DIVERGING_KEYS, DISPLAY_COLOR_RAMP_LINEAR_KEYS, TrackPathColorMode } from "src/colorizer";
import DropdownWithColorPicker from "src/components/Dropdowns/DropdownWithColorPicker";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import TrackPathLengthControl from "src/components/Tabs/Settings/TrackPathLengthControl";
import ToggleCollapse from "src/components/ToggleCollapse";
import { INTERNAL_BUILD, MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { useViewerStateStore } from "src/state";
import { VisuallyHidden } from "src/styles/utils";

import { DEFAULT_OUTLINE_COLOR_PRESETS, SETTINGS_GAP_PX } from "./constants";

const COLOR_RAMP_KEYS_TO_DISPLAY = [...DISPLAY_COLOR_RAMP_DIVERGING_KEYS, ...DISPLAY_COLOR_RAMP_LINEAR_KEYS];

const enum TrackPathSettingsHtmlIds {
  TRACK_PATH_COLOR_SELECT = "track-path-color-select",
  TRACK_PATH_WIDTH_SLIDER = "track-path-width-slider",
  TRACK_PATH_SHOW_BREAKS_CHECKBOX = "track-path-show-breaks-checkbox",
  TRACK_PATH_PAST_STEPS_SLIDER = "track-path-past-steps-slider",
  TRACK_PATH_FUTURE_STEPS_SLIDER = "track-path-future-steps-slider",
  TRACK_PATH_PERSIST_OUT_OF_RANGE_CHECKBOX = "track-path-persist-out-of-range-checkbox",
}

const TRACK_MODE_ITEMS: SelectItem[] = [
  { value: TrackPathColorMode.USE_OUTLINE_COLOR.toString(), label: "Highlight" },
  { value: TrackPathColorMode.USE_CUSTOM_COLOR.toString(), label: "Custom" },
  { value: TrackPathColorMode.USE_FEATURE_COLOR.toString(), label: "Feature" },
];
if (INTERNAL_BUILD) {
  TRACK_MODE_ITEMS.push({ value: TrackPathColorMode.USE_COLOR_MAP.toString(), label: "Colormap" });
}

export default function TrackPathSettings(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const showTrackPath = useViewerStateStore((state) => state.showTrackPath);
  const showTrackPathBreaks = useViewerStateStore((state) => state.showTrackPathBreaks);
  const trackPathColor = useViewerStateStore((state) => state.trackPathColor);
  const trackPathColorRampKey = useViewerStateStore((state) => state.trackPathColorRampKey);
  const trackPathIsColorRampReversed = useViewerStateStore((state) => state.trackPathIsColorRampReversed);
  const trackPathColorMode = useViewerStateStore((state) => state.trackPathColorMode);
  const trackPathWidthPx = useViewerStateStore((state) => state.trackPathWidthPx);
  const trackPathPastSteps = useViewerStateStore((state) => state.trackPathPastSteps);
  const trackPathFutureSteps = useViewerStateStore((state) => state.trackPathFutureSteps);
  const showAllTrackPathPastSteps = useViewerStateStore((state) => state.showAllTrackPathPastSteps);
  const showAllTrackPathFutureSteps = useViewerStateStore((state) => state.showAllTrackPathFutureSteps);
  const persistTrackPathWhenOutOfRange = useViewerStateStore((state) => state.persistTrackPathWhenOutOfRange);
  const setShowTrackPath = useViewerStateStore((state) => state.setShowTrackPath);
  const setTrackPathColor = useViewerStateStore((state) => state.setTrackPathColor);
  const setTrackPathColorRampKey = useViewerStateStore((state) => state.setTrackPathColorRampKey);
  const setTrackPathIsColorRampReversed = useViewerStateStore((state) => state.setTrackPathIsColorRampReversed);
  const setTrackPathColorMode = useViewerStateStore((state) => state.setTrackPathColorMode);
  const setTrackPathWidthPx = useViewerStateStore((state) => state.setTrackPathWidthPx);
  const setShowTrackPathBreaks = useViewerStateStore((state) => state.setShowTrackPathBreaks);
  const setTrackPathPastSteps = useViewerStateStore((state) => state.setTrackPathPastSteps);
  const setTrackPathFutureSteps = useViewerStateStore((state) => state.setTrackPathFutureSteps);
  const setShowAllTrackPathPastSteps = useViewerStateStore((state) => state.setShowAllTrackPathPastSteps);
  const setShowAllTrackPathFutureSteps = useViewerStateStore((state) => state.setShowAllTrackPathFutureSteps);
  const setPersistTrackPathWhenOutOfRange = useViewerStateStore((state) => state.setPersistTrackPathWhenOutOfRange);

  const maxTrackPathSteps = useMemo(() => dataset?.getMaxTrackLength() ?? 0, [dataset]);

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
            isRampReversed={trackPathIsColorRampReversed}
            showColorRamp={trackPathColorMode === TrackPathColorMode.USE_COLOR_MAP}
            selectedRampKey={trackPathColorRampKey}
            colorRampsToDisplay={COLOR_RAMP_KEYS_TO_DISPLAY}
            onRampChange={(key, reversed) => {
              setTrackPathColorRampKey(key);
              setTrackPathIsColorRampReversed(reversed);
            }}
            mirrorRamp={true}
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

        {
          // Locked behind an internal build flag for now since the track path
          // does not respond to updates yet.
          INTERNAL_BUILD && (
            <>
              <SettingsItem
                label="Past steps"
                htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_PAST_STEPS_SLIDER}
                style={{ marginTop: 4 }}
              >
                <TrackPathLengthControl
                  id={TrackPathSettingsHtmlIds.TRACK_PATH_PAST_STEPS_SLIDER}
                  value={trackPathPastSteps}
                  showAllValue={maxTrackPathSteps}
                  onValueChanged={setTrackPathPastSteps}
                  showAllChecked={showAllTrackPathPastSteps}
                  onShowAllChanged={setShowAllTrackPathPastSteps}
                />
              </SettingsItem>
              <SettingsItem
                label="Future steps"
                htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_FUTURE_STEPS_SLIDER}
                style={{ marginTop: 4 }}
              >
                <TrackPathLengthControl
                  id={TrackPathSettingsHtmlIds.TRACK_PATH_FUTURE_STEPS_SLIDER}
                  value={trackPathFutureSteps}
                  showAllValue={maxTrackPathSteps}
                  onValueChanged={setTrackPathFutureSteps}
                  showAllChecked={showAllTrackPathFutureSteps}
                  onShowAllChanged={setShowAllTrackPathFutureSteps}
                />
              </SettingsItem>
              <SettingsItem
                label="Persist when out of range"
                htmlFor={TrackPathSettingsHtmlIds.TRACK_PATH_PERSIST_OUT_OF_RANGE_CHECKBOX}
              >
                <Tooltip
                  title="Keep the track path visible when showing all past or future steps, even when the current time is outside the track's range."
                  placement="right"
                  trigger={["focus", "hover"]}
                >
                  <div style={{ width: "fit-content", paddingTop: 2 }}>
                    <Checkbox
                      id={TrackPathSettingsHtmlIds.TRACK_PATH_PERSIST_OUT_OF_RANGE_CHECKBOX}
                      type="checkbox"
                      checked={persistTrackPathWhenOutOfRange}
                      onChange={(event) => {
                        setPersistTrackPathWhenOutOfRange(event.target.checked);
                      }}
                      disabled={!(showAllTrackPathPastSteps || showAllTrackPathFutureSteps)}
                    ></Checkbox>
                  </div>
                </Tooltip>
              </SettingsItem>
            </>
          )
        }

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
