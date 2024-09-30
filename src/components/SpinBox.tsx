import React, { KeyboardEvent, ReactElement, useCallback, useEffect, useState } from "react";

import { SpinBoxHandleDownSVG, SpinBoxHandleUpSVG } from "../assets";

import styles from "./SpinBox.module.css";

type SpinBoxProps = {
  min?: number;
  max?: number;
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** Whether incrementing past the max range should cause the
   * input to wrap back to the min value (and vice-versa for
   * decrementing past the min value.)
   *
   * By default (false), incrementing/decrementing past the bounds will
   * will do nothing, and values will be clamped to the min/max.
   */
  wrapIncrement?: boolean;
  width?: string;
};

const defaultProps: Partial<SpinBoxProps> = {
  min: Number.MIN_SAFE_INTEGER,
  max: Number.MAX_SAFE_INTEGER,
  disabled: false,
  onChange: () => {},
  wrapIncrement: false,
};

/**
 * A numeric input with custom styled spinner handles.
 * - Enforces min/max value clamping.
 * - Displays a deferred value, only calling `onChange` when the user
 * presses enter or leaves focus (or when values are changed using the spin handles.)
 * - Optionally wraps increments that go past the min/max bounds.
 */
export default function SpinBox(propsInput: SpinBoxProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<SpinBoxProps>;

  /**
   * The input value, which updates as the user types.
   * When focus exits or enter is pressed, it will be synced with min/max values
   * and onChange will be called.
   */
  const [inputValue, setInputValue] = useState(props.value);

  // If the prop value changes, reset the input value to it.
  useEffect(() => {
    setInputValue(props.value);
  }, [props.value]);

  // Allow incrementing/decrementing the input value, which calls onChange
  // immediately.
  const adjustValue = useCallback(
    (delta: number): void => {
      let newValue = props.value + delta;
      if (!props.wrapIncrement) {
        // Clamp to min/max
        newValue = Math.max(props.min, Math.min(props.max, newValue));
      } else {
        // Wrap
        if (newValue > props.max) {
          newValue = props.min;
        } else if (newValue < props.min) {
          newValue = props.max;
        }
      }
      // Only call onChange if values actually changed
      if (newValue !== props.value) {
        props.onChange(newValue);
      }
    },
    [props.min, props.max, props.value]
  );

  const syncInputValue = useCallback(() => {
    // Clamp input value between min and max
    let newValue = inputValue;
    newValue = Math.max(props.min, Math.min(props.max, newValue));

    if (Number.isNaN(newValue)) {
      newValue = 0;
    }

    if (newValue === props.value && inputValue !== newValue) {
      // Force input value to reset
      setInputValue(newValue);
    } else if (newValue !== props.value) {
      props.onChange(newValue);
    }
  }, [inputValue, props.min, props.max, props.value]);

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") {
      syncInputValue();
    }
  };

  const onInputValueChange = useCallback((newValue: number) => {
    setInputValue(newValue);
  }, []);

  return (
    <div
      className={styles.spinBox + " " + (props.disabled ? styles.disabled : "")}
      style={props.width ? { maxWidth: props.width } : undefined}
    >
      <input
        type="number"
        min={props.min}
        max={props.max}
        value={inputValue}
        onChange={(event) => {
          onInputValueChange(event.target.valueAsNumber);
        }}
        onKeyDown={handleKeyDown}
        disabled={props.disabled}
        onBlur={syncInputValue}
        data-testid="spinbox-input"
      ></input>
      <div className={styles.spinButtons + " " + (props.disabled ? styles.disabled : "")}>
        {/** Tab index -1 prevents spin handles from being selected via tab navigation */}
        <button tabIndex={-1} onClick={() => adjustValue(1)} disabled={props.disabled}>
          <SpinBoxHandleUpSVG />
        </button>
        <button tabIndex={-1} onClick={() => adjustValue(-1)} disabled={props.disabled}>
          <SpinBoxHandleDownSVG />
        </button>
      </div>
    </div>
  );
}
