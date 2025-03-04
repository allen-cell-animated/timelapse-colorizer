import { Color as AntdColor } from "@rc-component/color-picker";
import { Card, Checkbox, ColorPicker, Radio } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";
import { useShallow } from "zustand/shallow";

import { VECTOR_KEY_MOTION_DELTA } from "../../../colorizer/constants";
import { VectorTooltipMode } from "../../../colorizer/types";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./constants";

import { useViewerStateStore } from "../../../state/ViewerState";
import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LabeledSlider from "../../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { MAX_SLIDER_WIDTH } from "../SettingsTab";

const VECTOR_OPTION_MOTION = {
  value: VECTOR_KEY_MOTION_DELTA,
  label: "Avg. movement delta (auto-calculated)",
};

export default function VectorFieldSettings(): ReactElement {
  const store = useViewerStateStore(
    useShallow((state) => ({
      dataset: state.dataset,
      vectorVisible: state.vectorVisible,
      vectorKey: state.vectorKey,
      vectorMotionTimeIntervals: state.vectorMotionTimeIntervals,
      vectorScaleFactor: state.vectorScaleFactor,
      vectorTooltipMode: state.vectorTooltipMode,
      vectorColor: state.vectorColor,
      setVectorVisible: state.setVectorVisible,
      setVectorKey: state.setVectorKey,
      setVectorMotionTimeIntervals: state.setVectorMotionTimeIntervals,
      setVectorScaleFactor: state.setVectorScaleFactor,
      setVectorTooltipMode: state.setVectorTooltipMode,
      setVectorColor: state.setVectorColor,
    }))
  );

  // TODO: Add additional vectors here when support for user vector data is added.
  const vectorOptions = useMemo(() => [VECTOR_OPTION_MOTION], []);

  return (
    <>
      <SettingsItem label={"Show vector arrows"}>
        <div>
          {/* TODO: Replace with a top-level checkbox for Vector arrows when Collapse menus are removed */}
          <Checkbox checked={store.vectorVisible} onChange={(e) => store.setVectorVisible(e.target.checked)} />
        </div>
      </SettingsItem>

      <SettingsItem label="Vector" labelStyle={{ height: "min-content", paddingTop: "2px" }}>
        <SelectionDropdown
          disabled={!store.vectorVisible}
          selected={store.vectorKey}
          items={vectorOptions}
          onChange={store.setVectorKey}
        ></SelectionDropdown>
        {store.vectorKey === VECTOR_KEY_MOTION_DELTA && store.vectorVisible && (
          <Card style={{ position: "relative", width: "fit-content", marginTop: "10px" }} size="small">
            <SettingsContainer>
              <SettingsItem label="Average over # time intervals">
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    type="value"
                    disabled={!store.vectorVisible}
                    step={1}
                    minSliderBound={1}
                    maxSliderBound={20}
                    minInputBound={1}
                    maxInputBound={100}
                    value={store.vectorMotionTimeIntervals}
                    onChange={store.setVectorMotionTimeIntervals}
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
      <SettingsItem label={"Scale factor"}>
        <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
            disabled={!store.vectorVisible}
            type="value"
            minSliderBound={0}
            maxSliderBound={50}
            minInputBound={0}
            maxInputBound={100}
            value={store.vectorScaleFactor}
            onChange={store.setVectorScaleFactor}
            marks={[1]}
          />
        </div>
      </SettingsItem>
      <SettingsItem label="Arrow color">
        <div>
          <ColorPicker
            disabled={!store.vectorVisible}
            disabledAlpha={true}
            size="small"
            value={new AntdColor(store.vectorColor.getHexString())}
            onChange={(_color, hex) => {
              store.setVectorColor(new Color(hex as ColorRepresentation));
            }}
            presets={DEFAULT_OUTLINE_COLOR_PRESETS}
          ></ColorPicker>
        </div>
      </SettingsItem>
      <SettingsItem label="Show vector in tooltip as" labelStyle={{ height: "fit-content" }}>
        <div style={{ width: "fit-content" }}>
          <Radio.Group
            value={store.vectorTooltipMode}
            onChange={(e) => store.setVectorTooltipMode(e.target.value)}
            disabled={!store.vectorVisible}
          >
            <Radio value={VectorTooltipMode.MAGNITUDE}>Magnitude and angle</Radio>
            <Radio value={VectorTooltipMode.COMPONENTS}>XY components</Radio>
          </Radio.Group>
        </div>
      </SettingsItem>
    </>
  );
}
