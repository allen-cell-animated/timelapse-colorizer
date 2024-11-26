import { Color as AntdColor } from "@rc-component/color-picker";
import { Card, Checkbox, ColorPicker } from "antd";
import React, { ReactElement } from "react";
import { Color, ColorRepresentation } from "three";

import { VECTOR_KEY_MOTION_DELTA } from "../../../colorizer/constants";
import { VectorConfig, ViewerConfig } from "../../../colorizer/types";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./constants";

import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LabeledSlider from "../../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { MAX_SLIDER_WIDTH } from "../SettingsTab";

const VECTOR_OPTION_MOTION = {
  key: VECTOR_KEY_MOTION_DELTA,
  label: "Avg. movement delta (auto-calculated)",
};

type VectorFieldSettingsProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;
};

export default function VectorFieldSettings(props: VectorFieldSettingsProps): ReactElement {
  const updateVectorConfig = (config: Partial<VectorConfig>): void => {
    props.updateConfig({ vectorConfig: { ...props.config.vectorConfig, ...config } });
  };

  // TODO: Add additional vectors here when support for user vector data is added.
  const vectorOptions = [VECTOR_OPTION_MOTION];

  return (
    <>
      <SettingsItem label={"Show vector arrows"}>
        <div>
          {/* TODO: Replace with a top-level checkbox for Vector arrows when Collapse menus are removed */}
          <Checkbox
            checked={props.config.vectorConfig.visible}
            onChange={(e) => updateVectorConfig({ visible: e.target.checked })}
          />
        </div>
      </SettingsItem>

      <SettingsItem label="Vector" labelStyle={{ height: "min-content", paddingTop: "2px" }}>
        <SelectionDropdown
          disabled={!props.config.vectorConfig.visible}
          selected={props.config.vectorConfig.key}
          items={vectorOptions}
          onChange={(key) => updateVectorConfig({ key })}
        ></SelectionDropdown>
        {props.config.vectorConfig.key === VECTOR_KEY_MOTION_DELTA && props.config.vectorConfig.visible && (
          <Card style={{ position: "relative", width: "fit-content", marginTop: "10px" }} size="small">
            <SettingsContainer>
              <SettingsItem label="Average over # time intervals">
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    type="value"
                    disabled={!props.config.vectorConfig.visible}
                    step={1}
                    minSliderBound={1}
                    maxSliderBound={20}
                    minInputBound={1}
                    maxInputBound={100}
                    value={props.config.vectorConfig.timeIntervals}
                    onChange={(timeIntervals: number) => updateVectorConfig({ timeIntervals })}
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
            disabled={!props.config.vectorConfig.visible}
            type="value"
            minSliderBound={0}
            maxSliderBound={50}
            minInputBound={0}
            maxInputBound={100}
            value={props.config.vectorConfig.scaleFactor}
            onChange={(amplitudePx: number) => updateVectorConfig({ scaleFactor: amplitudePx })}
            marks={[1]}
          />
        </div>
      </SettingsItem>
      <SettingsItem label="Arrow color">
        <div>
          <ColorPicker
            disabled={!props.config.vectorConfig.visible}
            disabledAlpha={true}
            size="small"
            value={new AntdColor(props.config.vectorConfig.color.getHexString())}
            onChange={(_color, hex) => {
              updateVectorConfig({ color: new Color(hex as ColorRepresentation) });
            }}
            presets={DEFAULT_OUTLINE_COLOR_PRESETS}
          ></ColorPicker>
        </div>
      </SettingsItem>
    </>
  );
}
