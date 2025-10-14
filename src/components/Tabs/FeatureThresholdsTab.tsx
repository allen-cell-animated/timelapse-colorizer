import { CloseOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { Checkbox, List, Select } from "antd";
import React, { ReactElement, ReactNode, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { DropdownSVG } from "../../assets";
import {
  CategoricalFeatureThreshold,
  FeatureThreshold,
  isThresholdCategorical,
  isThresholdNumeric,
  NumericFeatureThreshold,
  ThresholdType,
} from "../../colorizer/types";
import { thresholdMatchFinder } from "../../colorizer/utils/data_utils";
import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { ScrollShadowContainer, useScrollShadow } from "../../hooks";
import { FlexColumn } from "../../styles/utils";

import { FeatureType } from "../../colorizer/Dataset";
import { useViewerStateStore } from "../../state/ViewerState";
import IconButton from "../IconButton";
import LabeledSlider from "../Inputs/LabeledSlider";

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

const FiltersContainer = styled.div`
  position: relative;
  overflow: auto;
  height: 100%;
`;

const FiltersContent = styled.div`
  overflow-y: auto;
  height: 100%;
  padding: 0 10px;
  position: relative;
`;

const FeatureLabel = styled.h3<{ $disabled?: boolean }>`
  padding-bottom: 2px;
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

const CategoricalThresholdContainer = styled.div`
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  max-height: calc(24px * 4);
  align-content: flex-start;

  & label {
    min-width: 0;
    width: 30%;
    max-width: 190px;
  }

  & > label > span:not(.ant-checkbox) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const EmptyListTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

type FeatureThresholdsTabProps = {
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
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
  const selectContainerRef = useRef<HTMLDivElement>(null);

  const dataset = useViewerStateStore((state) => state.dataset);
  const setThresholds = useViewerStateStore((state) => state.setThresholds);
  const thresholds = useViewerStateStore((state) => state.thresholds);

  /** Converts a threshold to a unique key that can be used to look up its information later. Matches on feature key and unit. */
  const thresholdToKey = (threshold: FeatureThreshold): string => {
    return `${encodeURIComponent(threshold.featureKey)}:${threshold.unit ? encodeURIComponent(threshold.unit) : ""}`;
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
    for (const threshold of thresholds) {
      const featureData = dataset?.getFeatureData(threshold.featureKey);
      if (featureData && featureData.unit === threshold.unit && featureData.type !== FeatureType.CATEGORICAL) {
        featureMinMaxBoundsFallback.current.set(thresholdToKey(threshold), [featureData.min, featureData.max]);
      }
    }
  }, [dataset, thresholds]);

  ////// EVENT HANDLERS ///////////////////

  /** Handle the user selecting new features from the Select dropdown. */
  const onSelect = (featureKey: string): void => {
    const featureData = dataset?.getFeatureData(featureKey);
    const newThresholds = [...thresholds];
    if (featureData && !dataset?.isFeatureCategorical(featureKey)) {
      // Continuous/discrete feature
      newThresholds.push({
        type: ThresholdType.NUMERIC,
        featureKey: featureKey,
        unit: dataset!.getFeatureUnits(featureKey),
        min: featureData.min,
        max: featureData.max,
      });
    } else {
      // Categorical feature
      newThresholds.push({
        type: ThresholdType.CATEGORICAL,
        featureKey: featureKey,
        unit: dataset!.getFeatureUnits(featureKey),
        enabledCategories: Array(MAX_FEATURE_CATEGORIES).fill(true),
      });
    }
    setThresholds(newThresholds);
  };

  /** Handle the user removing features from the Select dropdown. */
  const onDeselect = (featureKey: string): void => {
    // Find the exact match for the threshold and remove it
    const featureData = dataset?.getFeatureData(featureKey);
    const newThresholds = [...thresholds];
    if (featureData) {
      const index = thresholds.findIndex(thresholdMatchFinder(featureKey, featureData.unit));
      if (index !== -1) {
        // Delete saved min/max bounds for this feature
        const thresholdToRemove = thresholds[index];
        featureMinMaxBoundsFallback.current.delete(thresholdToKey(thresholdToRemove));
        newThresholds.splice(index, 1);
      }
    }
    setThresholds(newThresholds);
  };

  const onCategoricalThresholdChanged = (index: number, enabledCategories: boolean[]): void => {
    const oldThreshold = thresholds[index];
    if (!isThresholdCategorical(oldThreshold)) {
      return;
    }
    const newThreshold: CategoricalFeatureThreshold = { ...oldThreshold, enabledCategories };
    const newThresholds = [...thresholds];
    newThresholds[index] = newThreshold;
    setThresholds(newThresholds);
  };

  const onNumericThresholdChanged = (index: number, min: number, max: number): void => {
    const oldThreshold = thresholds[index];
    if (!isThresholdNumeric(oldThreshold)) {
      return;
    }
    // Make a copy of the threshold and the threshold array to avoid mutating state directly.
    const newThreshold: NumericFeatureThreshold = { ...oldThreshold };

    newThreshold.min = min;
    newThreshold.max = max;

    const newThresholds = [...thresholds];
    newThresholds[index] = newThreshold;

    setThresholds(newThresholds);
  };

  /** Handle a threshold getting deleted via the UI buttons. */
  const onClickedRemove = (index: number): void => {
    const newThresholds = [...thresholds];
    newThresholds.splice(index, 1);
    // Delete saved min/max bounds for this feature when it's removed.
    const thresholdToDelete = thresholds[index];
    featureMinMaxBoundsFallback.current.delete(thresholdToKey(thresholdToDelete));
    setThresholds(newThresholds);
  };

  ////// RENDERING ///////////////////
  // The Select dropdown should ONLY show features that are currently present in the dataset.
  const featureOptions =
    dataset?.featureKeys.map((key) => ({
      label: dataset?.getFeatureNameWithUnits(key),
      value: key,
    })) || [];
  // Filter out thresholds that no longer match the dataset (feature and/or unit), so we only
  // show selections that are actually valid.
  const thresholdsInDataset = thresholds.filter((t) => {
    const featureData = dataset?.getFeatureData(t.featureKey);
    return featureData && featureData.unit === t.unit;
  });
  const selectedFeatures = thresholdsInDataset.map((t) => t.featureKey);

  const renderNumericItem = (item: NumericFeatureThreshold, index: number): ReactNode => {
    const featureData = dataset?.getFeatureData(item.featureKey);
    const disabled = featureData === undefined || featureData.unit !== item.unit;
    // If the feature is no longer in the dataset, use the saved min/max bounds.
    const savedMinMax = featureMinMaxBoundsFallback.current.get(thresholdToKey(item)) || [Number.NaN, Number.NaN];
    const sliderMin = disabled ? savedMinMax[0] : featureData.min;
    const sliderMax = disabled ? savedMinMax[1] : featureData.max;
    const stepSize = featureData?.type === FeatureType.DISCRETE ? 1 : undefined;

    return (
      <div style={{ width: "calc(min(100% - 10px, 500px)", margin: "10px 0 8px 0" }}>
        <LabeledSlider
          type="range"
          min={item.min}
          max={item.max}
          minSliderBound={sliderMin}
          maxSliderBound={sliderMax}
          onChange={(min, max) => onNumericThresholdChanged(index, min, max)}
          disabled={disabled}
          step={stepSize}
        />
      </div>
    );
  };

  const renderCategoricalItem = (item: CategoricalFeatureThreshold, index: number): ReactNode => {
    const featureData = dataset?.getFeatureData(item.featureKey);
    const disabled = featureData === undefined || featureData.unit !== item.unit;

    const categories = featureData?.categories || [];
    const enabledCategories = item.enabledCategories;

    const onChange = (categoryIndex: number): void => {
      const newEnabledCategories = [...enabledCategories];
      newEnabledCategories[categoryIndex] = !enabledCategories[categoryIndex];
      onCategoricalThresholdChanged(index, newEnabledCategories);
    };

    return (
      <CategoricalThresholdContainer>
        {categories.map((category, categoryIndex) => {
          return (
            <Checkbox
              key={categoryIndex}
              disabled={disabled}
              onChange={() => onChange(categoryIndex)}
              checked={enabledCategories[categoryIndex]}
            >
              {category}
            </Checkbox>
          );
        })}
      </CategoricalThresholdContainer>
    );
  };

  const renderListItems = (threshold: FeatureThreshold, index: number): ReactNode => {
    // Thresholds are matched on both feature names and units; a threshold must match
    // both in the current dataset to be enabled and editable.
    const featureData = dataset?.getFeatureData(threshold.featureKey);
    const disabled = featureData === undefined || featureData.unit !== threshold.unit;
    // TODO: This will show the internal feature key name for any filters on features not in
    // the current dataset. Show a different placeholder instead?
    const name = featureData?.name || threshold.featureKey;
    const featureLabel = threshold.unit ? `${name} (${threshold.unit})` : name;

    return (
      <List.Item style={{ position: "relative" }} key={index}>
        <div style={{ width: "100%" }}>
          <FeatureLabel $disabled={disabled}>{featureLabel}</FeatureLabel>

          {isThresholdCategorical(threshold)
            ? renderCategoricalItem(threshold, index)
            : renderNumericItem(threshold, index)}
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
          onClear={() => setThresholds([])}
          // Allows the selection dropdown to be selected and styled
          getPopupContainer={() => selectContainerRef.current!}
          maxTagCount={"responsive"}
          suffixIcon={isFocused ? <SearchOutlined /> : <DropdownSVG style={{ pointerEvents: "none", width: "12px" }} />}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // Fixes a bug where the last item would be cut off
          virtual={false}
        />
      </SelectContainer>
      <FiltersContainer>
        <FiltersContent style={{ paddingTop: 0 }} ref={scrollRef} onScroll={onScrollHandler}>
          <List
            renderItem={renderListItems}
            dataSource={thresholds}
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
        </FiltersContent>
        <ScrollShadowContainer style={scrollShadowStyle} />
      </FiltersContainer>
    </PanelContainer>
  );
}
