import React, { ReactElement, ReactNode, useEffect } from "react";
import { FeatureThreshold } from "../colorizer/ColorizeCanvas";
import { Dataset } from "../colorizer";
import { Card, List, Select } from "antd";
import styled from "styled-components";
import LabeledRangeSlider from "./LabeledRangeSlider";
import { CloseOutlined } from "@ant-design/icons";
import IconButton from "./IconButton";

const PanelContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
`;

const CardWithoutVerticalPadding = styled(Card)`
  overflow-y: auto;

  & .ant-card-body {
    padding-top: 0;
    padding-bottom: 0;
  }
`;
type FeatureThresholdPanelProps = {
  featureThresholds: FeatureThreshold[];
  onChange: (thresholds: FeatureThreshold[]) => void;
  dataset: Dataset | null;
  disabled?: boolean;
};
const defaultProps: Partial<FeatureThresholdPanelProps> = {
  disabled: false,
};

/**
 * A React component for adding, removing, and editing thresholds on features in a dataset.
 */
export default function FeatureThresholdPanel(inputProps: FeatureThresholdPanelProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<FeatureThresholdPanelProps>;

  // Clear thresholds for features that don't exist when the dataset changes.
  // TODO: Show these thresholds as disabled, rather than removing them.
  useEffect(() => {
    const newThresholds = props.featureThresholds.filter((t) => props.dataset?.featureNames.includes(t.featureName));
    props.onChange(newThresholds);
  }, [props.dataset]);

  /** Handle the user selecting new features. */
  const onSelectionsChanged = (selections: string[]): void => {
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

  /** Handle the threshold for a feature changing. */
  const onThresholdChanged = (index: number, min: number, max: number): void => {
    const newThresholds = [...props.featureThresholds];
    newThresholds[index] = { ...newThresholds[index], min, max };
    props.onChange(newThresholds);
  };

  /** Handle a threshold getting deleted. */
  const onClickedRemove = (index: number): void => {
    const newThresholds = [...props.featureThresholds];
    newThresholds.splice(index, 1);
    props.onChange(newThresholds);
  };

  const selectedFeatures = props.featureThresholds.map((t) => t.featureName);
  const featureOptions =
    props.dataset?.featureNames.map((name) => ({ label: props.dataset?.getFeatureNameWithUnits(name), value: name })) ||
    [];

  const renderListItems = (item: FeatureThreshold, index: number): ReactNode => {
    const featureData = props.dataset?.features[item.featureName];
    if (!featureData) {
      return <></>;
    }

    return (
      <List.Item style={{ position: "relative" }}>
        <div style={{ width: "100%" }}>
          <h3>{props.dataset?.getFeatureNameWithUnits(item.featureName)}</h3>
          <div style={{ width: "calc(100% - 10px)" }}>
            <LabeledRangeSlider
              min={item.min}
              max={item.max}
              minSliderBound={featureData.min}
              maxSliderBound={featureData.max}
              onChange={(min, max) => onThresholdChanged(index, min, max)}
            />
          </div>
        </div>
        <div style={{ position: "absolute", top: "10px", right: "10px" }}>
          <IconButton type="text" onClick={() => onClickedRemove(index)}>
            <CloseOutlined />
          </IconButton>
        </div>
      </List.Item>
    );
  };

  return (
    <PanelContainer>
      <Select
        style={{ width: "100%" }}
        mode="multiple"
        placeholder="Add features"
        onChange={onSelectionsChanged}
        value={selectedFeatures}
        options={featureOptions}
        disabled={props.disabled}
      />
      <CardWithoutVerticalPadding size="small" style={{ paddingTop: 0 }}>
        <List renderItem={renderListItems} dataSource={props.featureThresholds} />
      </CardWithoutVerticalPadding>
    </PanelContainer>
  );
}
