import { Card, Radio } from "antd";
import Checkbox from "antd/es/checkbox/Checkbox";
import React, { type ReactElement, useMemo } from "react";
import { Color, type ColorRepresentation } from "three";

import { VECTOR_KEY_MOTION_DELTA } from "src/colorizer/constants";
import { VectorTooltipMode } from "src/colorizer/types";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { ViewMode } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";
import { threeToAntColor } from "src/utils/color_utils";

import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./constants";

const VECTOR_OPTION_MOTION = {
  value: VECTOR_KEY_MOTION_DELTA,
  label: "Avg. movement delta (auto-calculated)",
};

const enum VectorSettingsHtmlIds {
  SHOW_VECTOR_ARROWS_CHECKBOX = "show-vector-arrows-checkbox",
  VECTOR_KEY_SELECT = "vector-key-select",
  VECTOR_SCALE_FACTOR_SLIDER = "vector-scale-factor-slider",
  VECTOR_SCALE_THICKNESS_CHECKBOX = "vector-scale-thickness-checkbox",
  VECTOR_THICKNESS_SLIDER = "vector-thickness-slider",
  VECTOR_COLOR_PICKER = "vector-color-picker",
  VECTOR_MOTION_TIME_INTERVALS_SLIDER = "vector-motion-time-intervals-slider",
  VECTOR_TOOLTIP_MODE_RADIO = "vector-tooltip-mode-radio",
}

export default function VectorFieldSettings(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const viewMode = useViewerStateStore((state) => state.viewMode);
  const setVectorColor = useViewerStateStore((state) => state.setVectorColor);
  const setVectorKey = useViewerStateStore((state) => state.setVectorKey);
  const setVectorMotionTimeIntervals = useViewerStateStore((state) => state.setVectorMotionTimeIntervals);
  const setVectorScaleFactor = useViewerStateStore((state) => state.setVectorScaleFactor);
  const setVectorScaleThickness = useViewerStateStore((state) => state.setVectorScaleThicknessByMagnitude);
  const setVectorThickness = useViewerStateStore((state) => state.setVectorThickness);
  const setVectorTooltipMode = useViewerStateStore((state) => state.setVectorTooltipMode);
  const vectorColor = useViewerStateStore((state) => state.vectorColor);
  const vectorKey = useViewerStateStore((state) => state.vectorKey);
  const vectorMotionTimeIntervals = useViewerStateStore((state) => state.vectorMotionTimeIntervals);
  const vectorScaleFactor = useViewerStateStore((state) => state.vectorScaleFactor);
  const vectorScaleThickness = useViewerStateStore((state) => state.vectorScaleThicknessByMagnitude);
  const vectorThickness = useViewerStateStore((state) => state.vectorThickness);
  const vectorTooltipMode = useViewerStateStore((state) => state.vectorTooltipMode);
  const vectorVisible = useViewerStateStore((state) => state.vectorVisible);

  // TODO: Add additional vectors here when support for user vector data is added.
  const vectorOptions = useMemo(() => [VECTOR_OPTION_MOTION], []);
  const vectorOptionsEnabled = vectorVisible && dataset !== null;

  const is3dDataset = viewMode == ViewMode.VIEW_3D;

  return (
    <>
      <SettingsItem
        label="Vector"
        labelStyle={{ height: "min-content", paddingTop: "2px" }}
        htmlFor={VectorSettingsHtmlIds.VECTOR_KEY_SELECT}
      >
        <SelectionDropdown
          id={VectorSettingsHtmlIds.VECTOR_KEY_SELECT}
          disabled={!vectorOptionsEnabled}
          selected={vectorKey}
          items={vectorOptions}
          onChange={setVectorKey}
          controlTooltipPlacement="right"
          controlWidth={"300px"}
        ></SelectionDropdown>
        {vectorKey === VECTOR_KEY_MOTION_DELTA && vectorOptionsEnabled && (
          <Card style={{ position: "relative", width: "fit-content", marginTop: "10px" }} size="small">
            <SettingsContainer>
              <SettingsItem
                label="Average over # time intervals"
                htmlFor={VectorSettingsHtmlIds.VECTOR_MOTION_TIME_INTERVALS_SLIDER}
              >
                <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    id={VectorSettingsHtmlIds.VECTOR_MOTION_TIME_INTERVALS_SLIDER}
                    type="value"
                    disabled={!vectorOptionsEnabled}
                    step={1}
                    minSliderBound={1}
                    maxSliderBound={20}
                    minInputBound={1}
                    maxInputBound={100}
                    value={vectorMotionTimeIntervals}
                    onChange={setVectorMotionTimeIntervals}
                  />
                </div>
              </SettingsItem>
            </SettingsContainer>
          </Card>
        )}
      </SettingsItem>
      {/*
       * TODO: Make this a logarithmic scale from 0 to 100, since we don't know what
       * the max value will be. Alternatively, make this an onscreen pixel radius,
       * and normalize all vectors to that length? -> this is possible since we precalculate
       * all deltas.
       * See examples in https://github.com/react-component/slider/issues/393.
       */}
      <SettingsItem label={"Scale factor"} htmlFor={VectorSettingsHtmlIds.VECTOR_SCALE_FACTOR_SLIDER}>
        <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
            id={VectorSettingsHtmlIds.VECTOR_SCALE_FACTOR_SLIDER}
            disabled={!vectorOptionsEnabled}
            type="value"
            minSliderBound={1}
            maxSliderBound={50}
            minInputBound={0}
            maxInputBound={100}
            value={vectorScaleFactor}
            onChange={setVectorScaleFactor}
            marks={[1]}
            step={0.5}
            numberFormatter={(value?: number) => `${value?.toFixed(1)}`}
          />
        </div>
      </SettingsItem>
      <SettingsItem label="Thickness" htmlFor={VectorSettingsHtmlIds.VECTOR_THICKNESS_SLIDER}>
        <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
            id={VectorSettingsHtmlIds.VECTOR_THICKNESS_SLIDER}
            type="value"
            value={vectorThickness}
            minSliderBound={0.1}
            maxSliderBound={5}
            minInputBound={0}
            maxInputBound={20}
            step={0.1}
            marks={[1]}
            onChange={setVectorThickness}
            numberFormatter={(value?: number) => `${value?.toFixed(1)}`}
            disabled={!vectorOptionsEnabled || !is3dDataset}
          ></LabeledSlider>
        </div>
      </SettingsItem>
      <SettingsItem
        label={"Scale thickness by magnitude"}
        htmlFor={VectorSettingsHtmlIds.VECTOR_SCALE_THICKNESS_CHECKBOX}
      >
        <Checkbox
          id={VectorSettingsHtmlIds.VECTOR_SCALE_THICKNESS_CHECKBOX}
          checked={vectorScaleThickness}
          onChange={(e) => setVectorScaleThickness(e.target.checked)}
          disabled={!vectorOptionsEnabled || !is3dDataset}
        />
      </SettingsItem>
      <SettingsItem label="Arrow color" htmlFor={VectorSettingsHtmlIds.VECTOR_COLOR_PICKER}>
        <WrappedColorPicker
          id={VectorSettingsHtmlIds.VECTOR_COLOR_PICKER}
          disabled={!vectorOptionsEnabled}
          disabledAlpha={true}
          size="small"
          value={threeToAntColor(vectorColor)}
          onChange={(_color, hex) => {
            setVectorColor(new Color(hex as ColorRepresentation));
          }}
          presets={DEFAULT_OUTLINE_COLOR_PRESETS}
        ></WrappedColorPicker>
      </SettingsItem>
      {/* TODO: Use a fieldset + legend for Radio inputs?
       * See https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/radio#defining_a_radio_group
       */}
      <SettingsItem
        label="Tooltip mode"
        labelStyle={{ height: "fit-content" }}
        htmlFor={VectorSettingsHtmlIds.VECTOR_TOOLTIP_MODE_RADIO}
      >
        <div style={{ width: "fit-content" }}>
          <Radio.Group
            id={VectorSettingsHtmlIds.VECTOR_TOOLTIP_MODE_RADIO}
            value={vectorTooltipMode}
            onChange={(e) => setVectorTooltipMode(e.target.value)}
            disabled={!vectorOptionsEnabled}
          >
            <Radio value={VectorTooltipMode.MAGNITUDE}>Magnitude and angle</Radio>
            <Radio value={VectorTooltipMode.COMPONENTS}>XY components</Radio>
          </Radio.Group>
        </div>
      </SettingsItem>
    </>
  );
}
