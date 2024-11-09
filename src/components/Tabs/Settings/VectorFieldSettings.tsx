import { Color as AntdColor } from "@rc-component/color-picker";
import { Card, ColorPicker, Radio } from "antd";
import React, { ReactElement } from "react";
import { Color, ColorRepresentation } from "three";

import { VECTOR_KEY_MOTION, VectorConfig, ViewerConfig } from "../../../colorizer/types";

import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LabeledSlider from "../../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { MAX_SLIDER_WIDTH } from "../SettingsTab";

const VECTOR_OPTION_MOTION = {
  key: VECTOR_KEY_MOTION,
  label: "Motion delta (auto-calculated)",
};

type VectorFieldSettingsProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;
};

export default function VectorFieldSettings(props: VectorFieldSettingsProps): ReactElement {
  const updateVectorConfig = (config: Partial<VectorConfig>) => {
    props.updateConfig({ vectorConfig: { ...props.config.vectorConfig, ...config } });
  };

  // TODO: Add additional vectors here when support for user vector data is added.
  const vectorOptions = [VECTOR_OPTION_MOTION];

  return (
    <>
      <SettingsItem label={"Show vectors"} align="top">
        <Radio.Group
          style={{ width: "fit-content" }}
          value={props.config.vectorConfig.visible}
          onChange={(e) => updateVectorConfig({ visible: e.target.value })}
        >
          <Radio value={true}>Show</Radio>
          <Radio value={false}>Hide</Radio>
        </Radio.Group>
      </SettingsItem>

      <SettingsItem label="Vector visualization" labelStyle={{ height: "min-content", paddingTop: "2px" }}>
        <SelectionDropdown
          selected={props.config.vectorConfig.key}
          items={vectorOptions}
          onChange={(key) => updateVectorConfig({ key })}
        ></SelectionDropdown>
        {props.config.vectorConfig.key === VECTOR_KEY_MOTION && (
          <Card style={{ position: "relative", width: "fit-content", marginTop: "10px" }} size="small">
            <SettingsContainer>
              <SettingsItem label="Smoothing steps">
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    type="value"
                    step={1}
                    minSliderBound={0}
                    maxSliderBound={10}
                    minInputBound={0}
                    maxInputBound={100}
                    value={props.config.vectorConfig.timesteps}
                    onChange={(timesteps: number) =>
                      updateVectorConfig({
                        timesteps,
                        timestepThreshold: Math.min(timesteps, props.config.vectorConfig.timestepThreshold),
                      })
                    }
                  />
                </div>
              </SettingsItem>
              <SettingsItem
                label="Min timesteps"
                tooltip={
                  "The minimum number of timesteps the tracked object must exist for before a vector motion arrow will be shown."
                }
              >
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    type="value"
                    step={1}
                    minSliderBound={0}
                    maxSliderBound={10}
                    minInputBound={0}
                    value={props.config.vectorConfig.timestepThreshold}
                    onChange={(timestepThreshold: number) =>
                      updateVectorConfig({
                        ...props.config.vectorConfig,
                        timestepThreshold,
                        timesteps: Math.max(timestepThreshold, props.config.vectorConfig.timesteps),
                      })
                    }
                  />
                </div>
              </SettingsItem>
            </SettingsContainer>
          </Card>
        )}
      </SettingsItem>
      {/* TODO: Make this a logarithmic scale from 0 to 100, since we don't know what
       * the max value will be. Alternatively, make this an onscreen pixel radius,
       * and normalize all vectors to that length? -> this is possible since we precalculate
       * all deltas.
       * See examples in https://github.com/react-component/slider/issues/393.
       */}
      <SettingsItem label={"Scale factor"}>
        <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
          <LabeledSlider
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
            disabledAlpha={true}
            size="small"
            value={new AntdColor(props.config.vectorConfig.color.getHexString())}
            onChange={(_color, hex) => {
              updateVectorConfig({ color: new Color(hex as ColorRepresentation) });
            }}
          ></ColorPicker>
        </div>
      </SettingsItem>
    </>
  );
}
