import React, { ReactElement, ReactEventHandler, useEffect, useRef } from "react";
import { InputNumber, Slider } from "antd";
import { clamp } from "three/src/math/MathUtils";
import styled from "styled-components";

type LabeledRangeSliderProps = {
  disabled?: boolean;
  /** Selected min range value.*/
  min: number;
  /** Selected max range value.*/
  max: number;
  /** The lower bound for the slider. */
  minSlider?: number;
  /** The upper bound for the slider. */
  maxSlider?: number;
  /** The lower bound for the numeric input. If undefined, uses MIN_SAFE_INTEGER. */
  minBound?: number;
  /** The upper bound for the numeric input. If undefined, uses MAX_SAFE_INTEGER. */
  maxBound?: number;

  onChange: (min: number, max: number) => void;
};

const defaultProps: Partial<LabeledRangeSliderProps> = {
  minBound: Number.MIN_SAFE_INTEGER,
  maxBound: Number.MAX_SAFE_INTEGER,
  minSlider: 0,
  maxSlider: 1,
};

const ComponentContainer = styled.div`
  display: inline-flex;
  align-items: center;
  flex-direction: row;
  gap: 5px;
  width: 100%;
  max-width: 460px;
  margin-right: 20px;
`;

const SliderContainer = styled.div`
  position: relative;
  max-width: 289px;
  width: 100%;
  font-size: 10px;
  margin: 4px;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  --label-position: calc(-1 * var(--font-size-label-small));
  z-index: 1;
`;

const SliderLabel = styled.p`
  position: absolute;
  bottom: var(--label-position);
  z-index: 0;

  &:not(:last-child) {
    // Weird hack to override font size by increasing specificity
    font-size: var(--font-size-label-small);
    left: 0;
  }

  &:last-child {
    font-size: var(--font-size-label-small);
    right: 0;
  }
`;

/**
 * Creates a Slider with two number input fields on either side. The slider is bounded
 * separately from the min and max value bounds and acts as a suggested range.
 */
export default function LabeledRangeSlider(inputProps: LabeledRangeSliderProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LabeledRangeSliderProps>;

  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);

  const handleValueChange = (minValue: number, maxValue: number) => {
    // Clamp values
    if (Number.isNaN(minValue)) {
      minValue = props.min;
    }
    if (Number.isNaN(maxValue)) {
      maxValue = props.max;
    }
    minValue = clamp(minValue, props.minBound, props.maxBound);
    maxValue = clamp(maxValue, props.minBound, props.maxBound);

    // Swap bounds if they're in the wrong order
    if (minValue > maxValue) {
      [minValue, maxValue] = [maxValue, minValue];
    }

    props.onChange(minValue, maxValue);
  };

  const handleMinInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    if (!minInput.current) {
      // reset input value
      handleValueChange(props.min, props.max);
      return;
    }
    const value = Number.parseFloat(minInput.current.value);
    handleValueChange(value, props.max);
  };

  const handleMaxInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    if (!maxInput.current) {
      handleValueChange(props.min, props.max);
      return;
    }
    const value = Number.parseFloat(maxInput.current.value);
    handleValueChange(props.min, value);
  };

  return (
    <ComponentContainer>
      <InputNumber
        ref={minInput}
        size="small"
        style={{ width: "80px" }}
        value={props.min}
        onPressEnter={handleMinInputChange}
        onBlur={handleMinInputChange}
        controls={false}
        disabled={props.disabled}
      />
      <SliderContainer>
        <Slider
          min={props.minSlider}
          max={props.maxSlider}
          range={{ draggableTrack: true }}
          value={[props.min, props.max]}
          disabled={props.disabled}
          onChange={(value: [number, number]) => {
            handleValueChange(value[0], value[1]);
          }}
        />
        <SliderLabel>{props.minSlider}</SliderLabel>
        <SliderLabel>{props.maxSlider}</SliderLabel>
      </SliderContainer>
      <InputNumber
        ref={maxInput}
        size="small"
        type="number"
        style={{ width: "80px" }}
        value={props.max}
        onPressEnter={handleMaxInputChange}
        onBlur={handleMaxInputChange}
        controls={false}
        disabled={props.disabled}
      />
    </ComponentContainer>
  );
}
