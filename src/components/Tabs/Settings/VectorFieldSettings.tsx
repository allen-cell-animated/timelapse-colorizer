import { Color as AntdColor } from "@rc-component/color-picker";
import { Card, Checkbox, ColorPicker, Radio } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

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
  const dataset = useViewerStateStore((state) => state.dataset);
  const setVectorColor = useViewerStateStore((state) => state.setVectorColor);
  const setVectorKey = useViewerStateStore((state) => state.setVectorKey);
  const setVectorMotionTimeIntervals = useViewerStateStore((state) => state.setVectorMotionTimeIntervals);
  const setVectorScaleFactor = useViewerStateStore((state) => state.setVectorScaleFactor);
  const setVectorTooltipMode = useViewerStateStore((state) => state.setVectorTooltipMode);
  const setVectorVisible = useViewerStateStore((state) => state.setVectorVisible);
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
      <SettingsItem label={"Show vector arrows"}>
        <div>
          {/* TODO: Replace with a top-level checkbox for Vector arrows when Collapse menus are removed */}
          <Checkbox
            checked={vectorVisible}
            onChange={(e) => setVectorVisible(e.target.checked)}
            disabled={dataset === null}
          />
        </div>
      </SettingsItem>

      <SettingsItem label="Vector" labelStyle={{ height: "min-content", paddingTop: "2px" }}>
        <SelectionDropdown
          disabled={!vectorOptionsEnabled}
          selected={vectorKey}
          items={vectorOptions}
          onChange={setVectorKey}
        ></SelectionDropdown>
        {vectorKey === VECTOR_KEY_MOTION_DELTA && vectorOptionsEnabled && (
          <Card style={{ position: "relative", width: "fit-content", marginTop: "10px" }} size="small">
            <SettingsContainer>
              <SettingsItem label="Average over # time intervals">
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
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
      <SettingsItem label={"Scale factor"}>
        <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
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
      <SettingsItem label="Arrow color">
        <div>
          <ColorPicker
            disabled={!vectorOptionsEnabled}
            disabledAlpha={true}
            size="small"
            value={new AntdColor(vectorColor.getHexString())}
            onChange={(_color, hex) => {
              setVectorColor(new Color(hex as ColorRepresentation));
            }}
            presets={DEFAULT_OUTLINE_COLOR_PRESETS}
          ></ColorPicker>
        </div>
      </SettingsItem>
      <SettingsItem label="Show vector in tooltip as" labelStyle={{ height: "fit-content" }}>
        <div style={{ width: "fit-content" }}>
          <Radio.Group
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
