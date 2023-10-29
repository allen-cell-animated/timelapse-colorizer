import React, { ReactElement, ReactNode, useContext, useMemo, useRef } from "react";
import { FeatureThreshold } from "../colorizer/ColorizeCanvas";
import { Dataset } from "../colorizer";
import { Card, List, Select, Tooltip } from "antd";
import styled from "styled-components";
import LabeledRangeSlider from "./LabeledRangeSlider";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import IconButton from "./IconButton";
import { AppThemeContext } from "./AppStyle";

const PanelContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
`;

const FiltersCard = styled(Card)`
  overflow-y: auto;
  height: 100%;

  & .ant-card-body {
    padding-top: 0;
    padding-bottom: 0;
    height: 100%;
  }
`;

const EmptyListTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  const theme = useContext(AppThemeContext);

  // Save the min/max values of each selected feature in case the user switches to a dataset that no longer has
  // that feature. This allows the user to switch back to the original dataset and keep the same thresholds.
  const featureMinMax = useRef<Map<string, [number, number]>>(new Map());

  // Update the saved min/max bounds of any selected features.
  useMemo(() => {
    if (!props.dataset) {
      return;
    }

    for (const threshold of props.featureThresholds) {
      const featureData = props.dataset?.features[threshold.featureName];
      if (featureData) {
        featureMinMax.current.set(threshold.featureName, [featureData.min, featureData.max]);
      }
    }
  }, [props.dataset, props.featureThresholds]);

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
    // Delete our saved min/max bounds for this feature when it's removed.
    featureMinMax.current.delete(props.featureThresholds[index].featureName);
    props.onChange(newThresholds);
  };

  const selectedFeatures = props.featureThresholds.map((t) => t.featureName);
  const featureOptions =
    props.dataset?.featureNames.map((name) => ({ label: props.dataset?.getFeatureNameWithUnits(name), value: name })) ||
    [];

  const renderListItems = (item: FeatureThreshold, index: number): ReactNode => {
    const featureData = props.dataset?.features[item.featureName];
    let sliderMin = 0;
    let sliderMax = 1;
    let disabled = featureData === undefined;

    let labelText = <>{props.dataset?.getFeatureNameWithUnits(item.featureName)}</>;

    if (!featureData) {
      // Dataset doesn't contain this feature, so used saved information to render it instead.
      const savedMinMax = featureMinMax.current.get(item.featureName);
      sliderMin = savedMinMax ? savedMinMax[0] : 0;
      sliderMax = savedMinMax ? savedMinMax[1] : 1;
      labelText = (
        <span style={{ color: theme.color.text.disabled }}>
          <i>{item.featureName}</i>
        </span>
      );
    } else {
      sliderMin = featureData.min;
      sliderMax = featureData.max;
    }

    return (
      <List.Item style={{ position: "relative" }}>
        <div style={{ width: "100%" }}>
          <h3>{labelText}</h3>
          <div style={{ width: "calc(100% - 10px)" }}>
            <LabeledRangeSlider
              min={item.min}
              max={item.max}
              minSliderBound={sliderMin}
              maxSliderBound={sliderMax}
              onChange={(min, max) => onThresholdChanged(index, min, max)}
              disabled={disabled}
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
      <FiltersCard size="small" style={{ paddingTop: 0 }}>
        <List
          renderItem={renderListItems}
          dataSource={props.featureThresholds}
          locale={{
            emptyText: (
              <EmptyListTextContainer>
                <span style={{ fontSize: "24px", marginBottom: 0 }}>
                  <FilterOutlined />
                </span>
                <p>No filters</p>
              </EmptyListTextContainer>
            ),
          }}
        />
      </FiltersCard>
    </PanelContainer>
  );
}
