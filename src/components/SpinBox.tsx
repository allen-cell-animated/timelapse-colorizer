import React, { ReactElement } from "react";
import styles from "./SpinBox.module.css";
import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";

type SpinBoxProps = {
  min?: number;
  max?: number;
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
};
const defaultProps: Partial<SpinBoxProps> = {
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  disabled: false,
  onChange: () => {},
};

export default function SpinBox(propsInput: SpinBoxProps): ReactElement {
  const props = { ...defaultProps, ...propsInput } as Required<SpinBoxProps>;

  return (
    <div className={styles.spinBox}>
      <input
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(event) => {
          props.onChange(event.target.valueAsNumber);
        }}
        disabled={props.disabled}
      ></input>
      <div className={styles.spinButtons}>
        <button
          tabIndex={-1}
          onClick={() => {
            props.onChange(props.value + 1);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 5">
            <path d="M3.78987 0.0967351L0.0582207 4.58749C-0.0806219 4.75448 0.0445836 5 0.268344 5L7.73176 5C7.95552 5 8.08061 4.75449 7.94176 4.58749L4.21012 0.0967352C4.18515 0.0665993 4.15325 0.0422287 4.11685 0.025469C4.08045 0.00870925 4.04048 -2.20023e-07 3.99999 -2.22273e-07C3.9595 -2.24523e-07 3.91954 0.00870924 3.88313 0.025469C3.84673 0.0422287 3.81484 0.0665993 3.78987 0.0967351Z" />
          </svg>
        </button>
        <button
          tabIndex={-1}
          onClick={() => {
            props.onChange(props.value - 1);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 5">
            <path d="M3.78987 0.0967351L0.0582207 4.58749C-0.0806219 4.75448 0.0445836 5 0.268344 5L7.73176 5C7.95552 5 8.08061 4.75449 7.94176 4.58749L4.21012 0.0967352C4.18515 0.0665993 4.15325 0.0422287 4.11685 0.025469C4.08045 0.00870925 4.04048 -2.20023e-07 3.99999 -2.22273e-07C3.9595 -2.24523e-07 3.91954 0.00870924 3.88313 0.025469C3.84673 0.0422287 3.81484 0.0665993 3.78987 0.0967351Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
