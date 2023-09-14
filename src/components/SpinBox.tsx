import React, { KeyboardEvent, ReactElement, useCallback, useEffect, useState } from "react";
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
};
const defaultProps: Partial<SpinBoxProps> = {
  min: Number.MIN_SAFE_INTEGER,
  max: Number.MAX_SAFE_INTEGER,
  disabled: false,
  onChange: () => {},
  wrapIncrement: false,
};

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
      props.onChange(newValue);
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

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      console.log("Wow!");
      syncInputValue();
    }
  };

  const onInputValueChange = useCallback((newValue: number) => {
    setInputValue(newValue);
  }, []);

  return (
    <div className={styles.spinBox + " " + (props.disabled ? styles.disabled : "")}>
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
        onSubmitCapture={() => {
          console.log("Submit: " + props.value);
        }}
        onBlur={syncInputValue}
      ></input>
      <div className={styles.spinButtons + " " + (props.disabled ? styles.disabled : "")}>
        <button tabIndex={-1} onClick={() => adjustValue(1)} disabled={props.disabled}>
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 5">
            <path d="M3.78987 0.0967351L0.0582207 4.58749C-0.0806219 4.75448 0.0445836 5 0.268344 5L7.73176 5C7.95552 5 8.08061 4.75449 7.94176 4.58749L4.21012 0.0967352C4.18515 0.0665993 4.15325 0.0422287 4.11685 0.025469C4.08045 0.00870925 4.04048 -2.20023e-07 3.99999 -2.22273e-07C3.9595 -2.24523e-07 3.91954 0.00870924 3.88313 0.025469C3.84673 0.0422287 3.81484 0.0665993 3.78987 0.0967351Z" />
          </svg>
        </button>
        <button tabIndex={-1} onClick={() => adjustValue(-1)} disabled={props.disabled}>
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 5">
            <path
              transform="scale(1, -1) translate(0, -4)"
              d="M3.78987 0.0967351L0.0582207 4.58749C-0.0806219 4.75448 0.0445836 5 0.268344 5L7.73176 5C7.95552 5 8.08061 4.75449 7.94176 4.58749L4.21012 0.0967352C4.18515 0.0665993 4.15325 0.0422287 4.11685 0.025469C4.08045 0.00870925 4.04048 -2.20023e-07 3.99999 -2.22273e-07C3.9595 -2.24523e-07 3.91954 0.00870924 3.88313 0.025469C3.84673 0.0422287 3.81484 0.0665993 3.78987 0.0967351Z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
