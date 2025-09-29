import { Card, Radio } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

import { VECTOR_KEY_MOTION_DELTA } from "@/colorizer/constants";
import { VectorTooltipMode } from "@/colorizer/types";
import SelectionDropdown from "@/components/Dropdowns/SelectionDropdown";
import LabeledSlider from "@/components/Inputs/LabeledSlider";
import WrappedColorPicker from "@/components/Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "@/components/SettingsContainer";
import { MAX_SETTINGS_SLIDER_WIDTH } from "@/constants";
import { useViewerStateStore } from "@/state/ViewerState";
import { threeToAntColor } from "@/utils/color_utils";

import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./constants";

const VECTOR_OPTION_MOTION = {
  value: VECTOR_KEY_MOTION_DELTA,
  label: "Avg. movement delta (auto-calculated)",
};

const enum VectorSettingsHtmlIds {
  SHOW_VECTOR_ARROWS_CHECKBOX = "show-vector-arrows-checkbox",
  VECTOR_KEY_SELECT = "vector-key-select",
  VECTOR_SCALE_FACTOR_SLIDER = "vector-scale-factor-slider",
  VECTOR_COLOR_PICKER = "vector-color-picker",
  VECTOR_MOTION_TIME_INTERVALS_SLIDER = "vector-motion-time-intervals-slider",
  VECTOR_TOOLTIP_MODE_RADIO = "vector-tooltip-mode-radio",
}

export default function VectorFieldSettings(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const setVectorColor = useViewerStateStore((state) => state.setVectorColor);
  const setVectorKey = useViewerStateStore((state) => state.setVectorKey);
  const setVectorMotionTimeIntervals = useViewerStateStore((state) => state.setVectorMotionTimeIntervals);
  const setVectorScaleFactor = useViewerStateStore((state) => state.setVectorScaleFactor);
  const setVectorTooltipMode = useViewerStateStore((state) => state.setVectorTooltipMode);
  const vectorColor = useViewerStateStore((state) => state.vectorColor);
  const vectorKey = useViewerStateStore((state) => state.vectorKey);
  const vectorMotionTimeIntervals = useViewerStateStore((state) => state.vectorMotionTimeIntervals);
  const vectorScaleFactor = useViewerStateStore((state) => state.vectorScaleFactor);
  const vectorTooltipMode = useViewerStateStore((state) => state.vectorTooltipMode);
  const vectorVisible = useViewerStateStore((state) => state.vectorVisible);

  // TODO: Add additional vectors here when support for user vector data is added.
  const vectorOptions = useMemo(() => [VECTOR_OPTION_MOTION], []);
  const vectorOptionsEnabled = vectorVisible && dataset !== null;

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
            minSliderBound={0}
            maxSliderBound={50}
            minInputBound={0}
            maxInputBound={100}
            value={vectorScaleFactor}
            onChange={setVectorScaleFactor}
            marks={[1]}
          />
        </div>
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
