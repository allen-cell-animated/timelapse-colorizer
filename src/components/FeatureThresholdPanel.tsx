import React, { ReactElement, ReactNode, useMemo, useRef, useState } from "react";
import { Card, List, Select } from "antd";
import { CloseOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import styled, { css } from "styled-components";

import DropdownSVG from "../assets/dropdown-arrow.svg?react";

import { FeatureThreshold } from "../colorizer/ColorizeCanvas";
import LabeledRangeSlider from "./LabeledRangeSlider";
import { Dataset } from "../colorizer";
import IconButton from "./IconButton";

const PanelContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
`;

const SelectContainer = styled.div`
  // Add some padding to the Select component so item tags have even spacing
  // above/below and left/right
  & .ant-select-selector {
    padding: 0 2px;
    font-weight: normal;
  }

  & .rc-virtual-list-holder-inner {
    gap: 2px;
  }

  // Override what selected items look like to match the style of
  // the dropdowns
  & .ant-select-item-option-selected > .ant-select-item-option-content {
    font-weight: normal;
    color: var(--color-button);
  }
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

const FeatureLabel = styled.h3<{ $disabled?: boolean }>`
  ${(props) => {
    if (props.$disabled) {
      return css`
        color: var(--color-text-disabled);
        font-style: italic !important;
      `;
    }
    return;
  }}
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
export default function FeatureThresholdPanel(
  inputProps: FeatureThresholdPanelProps
): ReactElement {
  const props = {
    ...defaultProps,
    ...inputProps,
  } as Required<FeatureThresholdPanelProps>;

  const [isFocused, setIsFocused] = useState<boolean>(false);
  const selectContainerRef = useRef<HTMLDivElement>(null);

  // Save the min/max values of each selected feature in case the user switches to a dataset that no longer has
  // that feature. This allows the sliders to be rendered with the same bounds as before until the user switches
  // back to a dataset that has the feature.
  const featureMinMax = useRef<Map<string, [number, number]>>(new Map());
  useMemo(() => {
    // Update the saved min/max bounds of any selected features.
    for (const threshold of props.featureThresholds) {
      const featureData = props.dataset?.features[threshold.featureName];
      if (featureData) {
        featureMinMax.current.set(threshold.featureName, [featureData.min, featureData.max]);
      }
    }
  }, [props.dataset, props.featureThresholds]);

  ////// EVENT HANDLERS ///////////////////

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
          newThresholds.push({
            featureName,
            min: featureData.min,
            max: featureData.max,
          });
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
    // Delete saved min/max bounds for this feature when it's removed.
    featureMinMax.current.delete(props.featureThresholds[index].featureName);
    props.onChange(newThresholds);
  };

  ////// RENDERING ///////////////////
  // TODO: Possible bug where selected features with the same name but different units/scaling across
  // datasets will use the same filter values.
  // Might not be a problem if collections have similarly-structured datasets...?
  // The alternative is to use the feature name + units as the key, but that may cause unexpected behavior
  // for users (such as if one dataset does not have units for a feature but another does)
  const selectedFeatures = props.featureThresholds.map((t) => t.featureName);
  const featureOptions =
    props.dataset?.featureNames.map((name) => ({
      label: props.dataset?.getFeatureNameWithUnits(name),
      value: name,
    })) || [];

  const renderListItems = (item: FeatureThreshold, index: number): ReactNode => {
    const featureData = props.dataset?.features[item.featureName];
    const savedMinMax = featureMinMax.current.get(item.featureName) || [0, 1];
    // If the feature is no longer in the dataset, use the saved min/max bounds.
    const sliderMin = featureData ? featureData.min : savedMinMax[0];
    const sliderMax = featureData ? featureData.max : savedMinMax[1];
    const disabled = featureData === undefined;

    return (
      <List.Item style={{ position: "relative" }}>
        <div style={{ width: "100%" }}>
          <FeatureLabel $disabled={disabled}>
            {props.dataset?.getFeatureNameWithUnits(item.featureName)}
          </FeatureLabel>
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
      <SelectContainer ref={selectContainerRef}>
        <Select
          style={{ width: "100%" }}
          allowClear
          mode="multiple"
          placeholder="Add features"
          onChange={onSelectionsChanged}
          value={selectedFeatures}
          options={featureOptions}
          disabled={props.disabled}
          onClear={() => props.onChange([])}
          // Allows the selection dropdown to be selected and styled
          getPopupContainer={() => selectContainerRef.current!}
          maxTagCount={"responsive"}
          suffixIcon={
            isFocused ? (
              <SearchOutlined />
            ) : (
              <DropdownSVG style={{ pointerEvents: "none", width: "12px" }} />
            )
          }
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </SelectContainer>
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
