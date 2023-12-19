import { CloseOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { Card, Checkbox, List, Select } from "antd";
import React, { ReactElement, ReactNode, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import DropdownSVG from "../../assets/dropdown-arrow.svg?react";

import { Dataset } from "../../colorizer";
import { CategoricalFeatureThreshold, FeatureThreshold, NumericFeatureThreshold } from "../../colorizer/types";
import { thresholdMatchFinder } from "../../colorizer/utils/data_utils";
import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { FlexColumn } from "../../styles/utils";
import IconButton from "../IconButton";
import LabeledRangeSlider from "../LabeledRangeSlider";

const PanelContainer = styled(FlexColumn)`
  flex-grow: 1;
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

type FeatureThresholdsTabProps = {
  featureThresholds: FeatureThreshold[];
  onChange: (thresholds: FeatureThreshold[]) => void;
  dataset: Dataset | null;
  disabled?: boolean;
};

const defaultProps: Partial<FeatureThresholdsTabProps> = {
  disabled: false,
};

/**
 * A React component for adding, removing, and editing thresholds on features in a dataset.
 */
export default function FeatureThresholdsTab(inputProps: FeatureThresholdsTabProps): ReactElement {
  const props = {
    ...defaultProps,
    ...inputProps,
  } as Required<FeatureThresholdsTabProps>;

  const [isFocused, setIsFocused] = useState<boolean>(false);
  const selectContainerRef = useRef<HTMLDivElement>(null);

  /** Converts a threshold to a unique key that can be used to look up its information later. Matches on feature name and unit. */
  const thresholdToKey = (threshold: FeatureThreshold): string => {
    return `${encodeURIComponent(threshold.featureName)}:${threshold.units ? encodeURIComponent(threshold.units) : ""}`;
  };
  // Save the FEATURE min/max bounds (not the selected range of the threshold) for each threshold. We do
  // this in case the user switches to a dataset that no longer has the threshold's feature
  // (no match for name + unit), which means there would be no way to get the feature's min/max bounds for the
  // slider.
  // Doing this allows the sliders be rendered with the same bounds as before and prevents weird UI behavior.
  const featureMinMaxBoundsFallback = useRef<Map<string, [number, number]>>(new Map());

  useMemo(() => {
    // Update the saved min/max bounds of any selected features.
    // This is done as a useMemo and not when the feature is added, in case we switch to another dataset
    // that has the same feature/unit but different min/max values. That way, our saved min/max bounds
    // reflect the last known good values.
    for (const threshold of props.featureThresholds) {
      const featureData = props.dataset?.getFeatureData(threshold.featureName);
      if (featureData && featureData.units === threshold.units) {
        featureMinMaxBoundsFallback.current.set(thresholdToKey(threshold), [featureData.min, featureData.max]);
      }
    }
  }, [props.dataset, props.featureThresholds]);

  ////// EVENT HANDLERS ///////////////////

  /** Handle the user selecting new features from the Select dropdown. */
  const onSelect = (featureName: string): void => {
    const featureData = props.dataset?.getFeatureData(featureName);
    const newThresholds = [...props.featureThresholds];
    if (featureData && !props.dataset?.isFeatureCategorical(featureName)) {
      // Continuous/discrete feature
      newThresholds.push({
        isCategorical: false,
        featureName: featureName,
        units: props.dataset!.getFeatureUnits(featureName),
        min: featureData.min,
        max: featureData.max,
      });
    } else {
      // Categorical feature
      newThresholds.push({
        isCategorical: true,
        featureName: featureName,
        units: props.dataset!.getFeatureUnits(featureName),
        enabledCategories: Array(MAX_FEATURE_CATEGORIES).fill(true),
      });
    }
    props.onChange(newThresholds);
  };

  /** Handle the user removing features from the Select dropdown. */
  const onDeselect = (featureName: string): void => {
    // Find the exact match for the threshold and remove it
    const featureData = props.dataset?.getFeatureData(featureName);
    const newThresholds = [...props.featureThresholds];
    if (featureData) {
      const index = props.featureThresholds.findIndex(thresholdMatchFinder(featureName, featureData.units));
      if (index !== -1) {
        // Delete saved min/max bounds for this feature
        const thresholdToRemove = props.featureThresholds[index];
        featureMinMaxBoundsFallback.current.delete(thresholdToKey(thresholdToRemove));
        newThresholds.splice(index, 1);
      }
    }
    props.onChange(newThresholds);
  };

  /** Handle the threshold for a feature changing. */
  const onCategoricalThresholdChanged = (index: number, enabled_categories: boolean[]): void => {
    const newThresholds = [...props.featureThresholds];
    const threshold = newThresholds[index];
    if (threshold.isCategorical) {
      threshold.enabledCategories = enabled_categories;
    }
    props.onChange(newThresholds);
  };

  /** Handle the threshold for a feature changing. */
  const onNumericThresholdChanged = (index: number, min: number, max: number): void => {
    const newThresholds = [...props.featureThresholds];
    const threshold = newThresholds[index];
    if (!threshold.isCategorical) {
      threshold.min = min;
      threshold.max = max;
    }
    props.onChange(newThresholds);
  };

  /** Handle a threshold getting deleted via the UI buttons. */
  const onClickedRemove = (index: number): void => {
    const newThresholds = [...props.featureThresholds];
    newThresholds.splice(index, 1);
    // Delete saved min/max bounds for this feature when it's removed.
    const thresholdToDelete = props.featureThresholds[index];
    featureMinMaxBoundsFallback.current.delete(thresholdToKey(thresholdToDelete));
    props.onChange(newThresholds);
  };

  ////// RENDERING ///////////////////
  // The Select dropdown should ONLY show features that are currently present in the dataset.
  const featureOptions =
    props.dataset?.featureNames.map((name) => ({
      label: props.dataset?.getFeatureNameWithUnits(name),
      value: name,
    })) || [];
  // Filter out thresholds that no longer match the dataset (feature and/or unit), so we only
  // show selections that are actually valid.
  const thresholdsInDataset = props.featureThresholds.filter((t) => {
    const featureData = props.dataset?.getFeatureData(t.featureName);
    return featureData && featureData.units === t.units;
  });
  const selectedFeatures = thresholdsInDataset.map((t) => t.featureName);

  const renderNumericItem = (item: NumericFeatureThreshold, index: number): ReactNode => {
    const featureData = props.dataset?.getFeatureData(item.featureName);
    const disabled = featureData === undefined || featureData.units !== item.units;
    // If the feature is no longer in the dataset, use the saved min/max bounds.
    const savedMinMax = featureMinMaxBoundsFallback.current.get(thresholdToKey(item)) || [Number.NaN, Number.NaN];
    const sliderMin = disabled ? savedMinMax[0] : featureData.min;
    const sliderMax = disabled ? savedMinMax[1] : featureData.max;

    return (
      <div style={{ width: "calc(100% - 10px)" }}>
        <LabeledRangeSlider
          min={item.min}
          max={item.max}
          minSliderBound={sliderMin}
          maxSliderBound={sliderMax}
          onChange={(min, max) => onNumericThresholdChanged(index, min, max)}
          disabled={disabled}
        />
      </div>
    );
  };

  const renderCategoricalItem = (item: CategoricalFeatureThreshold, index: number): ReactNode => {
    const featureData = props.dataset?.getFeatureData(item.featureName);
    const disabled = featureData === undefined || featureData.units !== item.units;

    const categories = featureData?.categories || [];
    const enabledCategories = item.enabledCategories;

    const onChange = (categoryIndex: number) => {
      const newEnabledCategories = [...enabledCategories];
      newEnabledCategories[categoryIndex] = !enabledCategories[categoryIndex];
      onCategoricalThresholdChanged(index, newEnabledCategories);
    };

    return (
      <div style={{ width: "calc(100% - 10px)" }}>
        {categories.map((category, categoryIndex) => {
          return (
            <Checkbox disabled={disabled} onChange={() => onChange(categoryIndex)}>
              {category}
            </Checkbox>
          );
        })}
      </div>
    );
  };

  const renderListItems = (item: FeatureThreshold, index: number): ReactNode => {
    // Thresholds are matched on both feature names and units; a threshold must match
    // both in the current dataset to be valid.
    const featureData = props.dataset?.getFeatureData(item.featureName);
    const disabled = featureData === undefined || featureData.units !== item.units;
    const featureLabel = item.units ? `${item.featureName} (${item.units})` : item.featureName;

    return (
      <List.Item style={{ position: "relative" }}>
        <div style={{ width: "100%" }}>
          <FeatureLabel $disabled={disabled}>{featureLabel}</FeatureLabel>

          {item.isCategorical ? renderCategoricalItem(item, index) : renderNumericItem(item, index)}
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
          onSelect={onSelect}
          onDeselect={onDeselect}
          value={selectedFeatures}
          options={featureOptions}
          disabled={props.disabled}
          onClear={() => props.onChange([])}
          // Allows the selection dropdown to be selected and styled
          getPopupContainer={() => selectContainerRef.current!}
          maxTagCount={"responsive"}
          suffixIcon={isFocused ? <SearchOutlined /> : <DropdownSVG style={{ pointerEvents: "none", width: "12px" }} />}
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
