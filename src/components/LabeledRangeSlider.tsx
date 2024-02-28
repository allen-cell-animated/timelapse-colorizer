import { InputNumber, Slider } from "antd";
import React, { ReactElement, ReactEventHandler, ReactNode, useRef } from "react";
import styled, { css } from "styled-components";
import { clamp } from "three/src/math/MathUtils";

import { numberToStringDecimal, setMaxDecimalPrecision } from "../colorizer/utils/math_utils";
import { excludeUndefinedValues } from "../colorizer/utils/react_utils";

type LabeledRangeSliderProps = {
  disabled?: boolean;
  /** Currently selected min range value.*/
  min: number;
  /** Currently selected max range value.*/
  max: number;
  /** The lower bound for the slider. If undefined, uses Number.NaN. */
  minSliderBound?: number;
  /** The upper bound for the slider. If undefined, uses Number.NaN. */
  maxSliderBound?: number;
  /** The lower bound for the numeric input. If undefined, uses MIN_SAFE_INTEGER. */
  minInputBound?: number;
  /** The upper bound for the numeric input. If undefined, uses MAX_SAFE_INTEGER. */
  maxInputBound?: number;
  // TODO: Turn on/off integer snapping with a hotkey? (like if shift/control is pressed)
  /** Minimum number of steps for the slider to use if integer steps cannot be used.
   * Default is 25. */
  minSteps?: number;
  /** Marks to draw on the range slider. */
  marks?: number[] | undefined;
  // TODO: Add a way to fetch significant figures for each feature. This is a temporary fix
  // and may not work for all features. Use scientific notation maybe?
  maxDecimalsToDisplay?: number;

  onChange: (min: number, max: number) => void;
};

const defaultProps: Partial<LabeledRangeSliderProps> = {
  minInputBound: Number.MIN_SAFE_INTEGER,
  maxInputBound: Number.MAX_SAFE_INTEGER,
  minSliderBound: Number.NaN,
  maxSliderBound: Number.NaN,
  minSteps: 25,
  maxDecimalsToDisplay: 3,
  marks: undefined,
};

// STYLING /////////////////////////////////////////////////////////////////

const ComponentContainer = styled.div`
  display: inline-flex;
  align-items: center;
  flex-direction: row;
  gap: 5px;
  width: 100%;
  max-width: 460px;
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

  // Override antd layout change for sliders with marks applied.
  // The margin is normally made larger to accommodate the mark text,
  // but in this case we only show the marks and no label text.
  & .ant-slider-with-marks {
    margin: 9.625px 4.375px;
  }
`;

const SliderLabel = styled.p<{ $disabled?: boolean }>`
  position: absolute;
  bottom: var(--label-position);
  z-index: 0;

  ${(props) => {
    if (props.$disabled) {
      return css`
        color: var(--color-text-disabled);
      `;
    }
    return;
  }}

  &:not(:last-child) {
    // Bit of a hack to override font size by increasing specificity
    font-size: var(--font-size-label-small);
    left: 0;
  }

  &:last-child {
    font-size: var(--font-size-label-small);
    right: 0;
  }
`;

///////////////////////////////////////////////////////////////////

/**
 * Creates a Slider with two number input fields on either side. The slider is bounded
 * separately from the min and max value bounds and acts as a suggested range.
 */
export default function LabeledRangeSlider(inputProps: LabeledRangeSliderProps): ReactElement {
  const props = { ...defaultProps, ...excludeUndefinedValues(inputProps) } as Required<LabeledRangeSliderProps>;

  // TODO: Could add a controlled/uncontrolled mode to this component, maybe with
  // a custom hook? (e.g., use state if min/max are undefined, otherwise use props)

  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);

  // Broadcast changes to input fields
  const handleValueChange = (minValue: number, maxValue: number): void => {
    // Clamp values
    if (Number.isNaN(minValue)) {
      minValue = props.min;
    }
    if (Number.isNaN(maxValue)) {
      maxValue = props.max;
    }
    minValue = clamp(minValue, props.minInputBound, props.maxInputBound);
    maxValue = clamp(maxValue, props.minInputBound, props.maxInputBound);

    // Swap bounds if they're in the wrong order
    if (minValue > maxValue) {
      [minValue, maxValue] = [maxValue, minValue];
    }

    props.onChange(minValue, maxValue);
  };

  // Handle changes to input field. This only triggers with enter or blur,
  // to prevent the input values from swapping mid-input.
  const handleMinInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    const value = Number.parseFloat(minInput.current!.value);
    handleValueChange(value, props.max);
  };
  const handleMaxInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    const value = Number.parseFloat(maxInput.current!.value);
    handleValueChange(props.min, value);
  };

  let stepSize = (props.maxSliderBound - props.minSliderBound) / props.minSteps;
  stepSize = clamp(stepSize, 0, 1);
  stepSize = setMaxDecimalPrecision(stepSize, 3);

  let marks: undefined | Record<number, ReactNode> = undefined;
  if (props.marks) {
    marks = {};
    // Set the mark values to empty fragments so Antd still renders the marks
    // but without any text labels. This cannot be null/undefined or else Antd
    // ignores the marks altogether.
    props.marks.forEach((value) => {
      marks![value] = <></>;
    });
  }

  // Use a placeholder if the min/max bounds are undefined
  const minSliderLabel = Number.isNaN(props.minSliderBound)
    ? "--"
    : numberToStringDecimal(props.minSliderBound, props.maxDecimalsToDisplay);
  const maxSliderLabel = Number.isNaN(props.maxSliderBound)
    ? "--"
    : numberToStringDecimal(props.maxSliderBound, props.maxDecimalsToDisplay);

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
          min={props.minSliderBound}
          max={props.maxSliderBound}
          range={{ draggableTrack: true }}
          value={[props.min, props.max]}
          disabled={props.disabled}
          onChange={(value: [number, number]) => {
            handleValueChange(value[0], value[1]);
          }}
          marks={marks}
          step={stepSize}
          // Show formatted decimals in tooltip
          // TODO: Is this better than showing the precise value?
          tooltip={{
            formatter: (value) => numberToStringDecimal(value, props.maxDecimalsToDisplay),
            open: props.disabled ? false : undefined, // Hide tooltip when disabled
          }}
        />
        <SliderLabel $disabled={props.disabled}>{minSliderLabel}</SliderLabel>
        <SliderLabel $disabled={props.disabled}>{maxSliderLabel}</SliderLabel>
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
