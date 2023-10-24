import React, { ReactElement } from "react";
import { FeatureThreshold } from "../colorizer/ColorizeCanvas";
import { Dataset } from "../colorizer";
import { Card, List, Select } from "antd";
import styled from "styled-components";
import { render } from "@testing-library/react";
import LabeledRangeSlider from "./LabeledRangeSlider";

const PanelContainer = styled.div`
  max-width: calc(100vw - 60px);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

type FeatureThresholdPanelProps = {
  featureThresholds: FeatureThreshold[];
  onChange: (thresholds: FeatureThreshold[]) => void;

  dataset: Dataset | null;
};
const defaultProps: Partial<FeatureThresholdPanelProps> = {};

export default function FeatureThresholdPanel(inputProps: FeatureThresholdPanelProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<FeatureThresholdPanelProps>;

  // Render current filters to a list

  const onSelectionsChanged = (selections: string[]) => {
    const newThresholds: FeatureThreshold[] = [];
    selections.forEach((featureName) => {
      // Set up default values for any new selected features, otherwise keep old thresholds
      const existingThreshold = props.featureThresholds.find((t) => t.featureName === featureName);
      if (existingThreshold) {
        newThresholds.push(existingThreshold);
      } else {
        const featureData = props.dataset?.features[featureName];
        if (featureData) {
          newThresholds.push({ featureName, min: featureData.min, max: featureData.max });
        }
      }
    });
    props.onChange(newThresholds);
  };

  const onThresholdChanged = (index: number, min: number, max: number) => {
    const newThresholds = [...props.featureThresholds];
    newThresholds[index] = { ...newThresholds[index], min, max };
    props.onChange(newThresholds);
  };

  const selectedFeatures = props.featureThresholds.map((t) => t.featureName);
  const featureOptions =
    props.dataset?.featureNames.map((name) => ({ label: props.dataset?.getFeatureNameWithUnits(name), value: name })) ||
    [];

  const renderItem = (item: FeatureThreshold, index: number) => {
    const featureData = props.dataset?.features[item.featureName];
    if (!featureData) {
      return <></>;
    }

    return (
      <List.Item>
        <div style={{ width: "100%" }}>
          <h3>{item.featureName}</h3>
          <div style={{ width: "100%" }}>
            <LabeledRangeSlider
              min={item.min}
              max={item.max}
              minSliderBound={featureData.min}
              maxSliderBound={featureData.max}
              onChange={(min, max) => onThresholdChanged(index, min, max)}
            />
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <PanelContainer>
      <h2>Filters</h2>
      <h3>Add features</h3>
      <Select
        style={{ width: "100%" }}
        mode="multiple"
        placeholder="Select filters"
        onChange={onSelectionsChanged}
        value={selectedFeatures}
        options={featureOptions}
      />
      <List renderItem={renderItem} dataSource={props.featureThresholds} bordered />
    </PanelContainer>
  );
}
