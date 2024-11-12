import { InputNumber, Slider } from "antd";
import { SliderBaseProps, SliderRangeProps, SliderSingleProps } from "antd/es/slider";
import React, { ReactElement, ReactEventHandler, ReactNode, useRef } from "react";
import styled, { css } from "styled-components";
import { clamp } from "three/src/math/MathUtils";

import { numberToStringDecimal, setMaxDecimalPrecision } from "../colorizer/utils/math_utils";
import { excludeUndefinedValues } from "../colorizer/utils/react_utils";

type BaseLabeledSliderProps = {
  type: "range" | "value";
  disabled?: boolean;

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
  /** The step size for the slider. Overrides `minSteps` if set. */
  step?: number;
  /** Marks to draw on the slider. */
  marks?: number[] | undefined;
  // TODO: Add a way to fetch significant figures for each feature. This is a temporary fix
  // and may not work for all features. Use scientific notation maybe?
  maxDecimalsToDisplay?: number;
  /**
   * Optional method for formatting display numbers, used in the slider tooltip and the text labels
   * under the slider endpoints. If undefined, formats numbers to `maxDecimalsToDisplay` decimal places.
   */
  numberFormatter?: (value?: number) => React.ReactNode;
};

type LabeledRangeSliderProps = BaseLabeledSliderProps & {
  type: "range";
  /** Currently selected min range value.*/
  min: number;
  /** Currently selected max range value.*/
  max: number;
  onChange: (min: number, max: number) => void;
};

type LabeledValueSliderProps = BaseLabeledSliderProps & {
  type: "value";
  value: number;
  onChange: (value: number) => void;
};

type LabeledSliderProps = LabeledRangeSliderProps | LabeledValueSliderProps;

const defaultProps: Partial<LabeledSliderProps> = {
  type: "range",
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
  min-width: 200px;
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
 * Creates a Slider with numeric input fields, either a value or min/max range.
 * The slider is bounded separately from the input bounds and acts as a suggested range.
 */
export default function LabeledSlider(inputProps: LabeledSliderProps): ReactElement {
  const props = { ...defaultProps, ...excludeUndefinedValues(inputProps) } as Required<LabeledSliderProps>;

  // TODO: Could add a controlled/uncontrolled mode to this component, maybe with
  // a custom hook? (e.g., use state if min/max are undefined, otherwise use props)

  const valueInput = useRef<HTMLInputElement>(null);
  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);

  // Broadcast changes to input fields
  const handleValueChange = (value: number): void => {
    if (props.type !== "value" || Number.isNaN(value)) {
      return;
    }
    value = clamp(value, props.minInputBound, props.maxInputBound);
    props.onChange(value);
  };

  const handleRangeChange = (minValue: number, maxValue: number): void => {
    if (props.type !== "range") {
      return;
    }
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
  const handleValueInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    if (props.type === "value") {
      const value = Number.parseFloat(valueInput.current!.value);
      handleValueChange(value);
    }
  };
  const handleMinInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    if (props.type === "range") {
      const value = Number.parseFloat(minInput.current!.value);
      handleRangeChange(value, props.max);
    }
  };
  const handleMaxInputChange: ReactEventHandler<HTMLInputElement> = (): void => {
    if (props.type === "range") {
      const value = Number.parseFloat(maxInput.current!.value);
      handleRangeChange(props.min, value);
    }
  };

  let stepSize = props.step ? props.step : (props.maxSliderBound - props.minSliderBound) / props.minSteps;
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

  const defaultNumberFormatter = (value?: number): string => numberToStringDecimal(value, props.maxDecimalsToDisplay);
  const numberFormatter = props.numberFormatter ? props.numberFormatter : defaultNumberFormatter;

  // Use a placeholder if the min/max bounds are undefined
  const minSliderLabel = Number.isNaN(props.minSliderBound) ? "--" : numberFormatter(props.minSliderBound);
  const maxSliderLabel = Number.isNaN(props.maxSliderBound) ? "--" : numberFormatter(props.maxSliderBound);

  // Slider Props
  const sharedSliderProps: Partial<SliderBaseProps> = {
    min: props.minSliderBound,
    max: props.maxSliderBound,
    disabled: props.disabled,
    marks: marks,
    step: stepSize,
    // Show formatted decimals in tooltip
    // TODO: Is this better than showing the precise value?
    tooltip: {
      formatter: numberFormatter,
      open: props.disabled ? false : undefined, // Hide tooltip when disabled
    },
  };
  const valueSliderProps: SliderSingleProps = {
    value: props.type === "value" ? props.value : undefined,
    onChange: handleValueChange,
  };
  const rangeSliderProps: SliderRangeProps = {
    range: { draggableTrack: true },
    value: props.type === "range" ? [props.min, props.max] : undefined,
    onChange: (value: [number, number]) => handleRangeChange(value[0], value[1]),
  };

  // Numeric input field props
  const sharedInputNumberProps: Partial<InputNumberProps> = {
    size: "small",
    controls: false,
    disabled: props.disabled,
    style: { width: "80px" },
    type: "number",
  };

  type InputNumberProps = Partial<Parameters<typeof InputNumber>[0]>;
  const valueInputNumberProps: InputNumberProps = {
    ref: valueInput,
    value: props.type === "value" ? props.value : undefined,
    onPressEnter: handleValueInputChange,
    onBlur: handleValueInputChange,
  };
  const minInputNumberProps: InputNumberProps = {
    ref: minInput,
    value: props.type === "range" ? props.min : undefined,
    onPressEnter: handleMinInputChange,
    onBlur: handleMinInputChange,
  };
  const maxInputNumberProps: InputNumberProps = {
    ref: maxInput,
    value: props.type === "range" ? props.max : undefined,
    onPressEnter: handleMaxInputChange,
    onBlur: handleMaxInputChange,
  };

  return (
    <ComponentContainer>
      {
        // Conditionally render either min or value input
        props.type === "value" ? (
          <InputNumber {...sharedInputNumberProps} {...valueInputNumberProps} />
        ) : (
          <InputNumber {...sharedInputNumberProps} {...minInputNumberProps} />
        )
      }
      <SliderContainer>
        <Slider {...sharedSliderProps} {...(props.type === "value" ? valueSliderProps : rangeSliderProps)} />
        <SliderLabel $disabled={props.disabled}>{minSliderLabel}</SliderLabel>
        <SliderLabel $disabled={props.disabled}>{maxSliderLabel}</SliderLabel>
      </SliderContainer>
      {props.type === "range" && <InputNumber {...sharedInputNumberProps} {...maxInputNumberProps} />}
    </ComponentContainer>
  );
}
