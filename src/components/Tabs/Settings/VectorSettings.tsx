import { Checkbox } from "antd";
import React, { ReactElement } from "react";

import { VectorConfig, VectorViewMode, ViewerConfig } from "../../../colorizer/types";

import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LabeledSlider from "../../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { MAX_SLIDER_WIDTH } from "../SettingsTab";

const VECTOR_OPTION_HIDE = {
  key: "__hide",
  label: "Hide",
};

const VECTOR_OPTION_MOTION = {
  key: "__motion",
  label: "Motion delta (auto-calculated)",
};

type VectorSettingsProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;
};

export default function VectorSettings(props: VectorSettingsProps): ReactElement {
  const updateVectorConfig = (config: Partial<VectorConfig>) => {
    props.updateConfig({ vectorConfig: { ...props.config.vectorConfig, ...config } });
  };

  const vectorOptions = [VECTOR_OPTION_HIDE, VECTOR_OPTION_MOTION];
  const onSelectVectorType = (key: string) => {
    updateVectorConfig({
      mode: key === VECTOR_OPTION_HIDE.key ? VectorViewMode.HIDE : VectorViewMode.ALL,
    });
  };
  const selectedVectorKey =
    props.config.vectorConfig.mode === VectorViewMode.HIDE ? VECTOR_OPTION_HIDE.key : VECTOR_OPTION_MOTION.key;

  return (
    <>
      <SettingsItem label="Vector visualization" labelStyle={{ height: "min-content", paddingTop: "2px" }}>
        <SelectionDropdown
          selected={selectedVectorKey}
          items={vectorOptions}
          onChange={onSelectVectorType}
        ></SelectionDropdown>
        {props.config.vectorConfig.mode !== VectorViewMode.HIDE && (
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
              label="Minimum timesteps"
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
        )}
      </SettingsItem>
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
      <SettingsItem>
        <Checkbox
          type="checkbox"
          checked={props.config.vectorConfig.mode === VectorViewMode.ALL}
          onChange={(event) => {
            updateVectorConfig({
              mode: event.target.checked ? VectorViewMode.ALL : VectorViewMode.HIDE,
            });
          }}
        >
          Show vectors
        </Checkbox>
      </SettingsItem>
    </>
  );
}
