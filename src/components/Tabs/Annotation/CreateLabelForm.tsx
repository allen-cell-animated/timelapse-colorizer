import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, InputRef } from "antd";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Color } from "three";

import { FlexColumn, FlexRow } from "../../../styles/utils";

import { LabelOptions } from "../../../colorizer/AnnotationData";
import { DEFAULT_LABEL_COLOR_PRESETS } from "./LabelEditControls";

type CreateLabelFormProps = {
  initialLabelOptions: LabelOptions;
  onConfirm: (options: LabelOptions) => void;
  onCancel: () => void;
  onColorChanged?: (color: Color) => void;
  confirmText?: string;
  focusNameInput?: boolean;
};

const defaultProps: Partial<CreateLabelFormProps> = {
  confirmText: "Create",
  focusNameInput: true,
  onColorChanged: () => {},
};

export default function CreateLabelForm(inputProps: CreateLabelFormProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CreateLabelFormProps>;

  const [color, setColor] = useState(props.initialLabelOptions.color);
  const [nameInput, setNameInput] = useState(props.initialLabelOptions.name);
  const nameInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (nameInputRef.current && props.focusNameInput) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setColor(props.initialLabelOptions.color);
  }, [props.initialLabelOptions.color]);

  useEffect(() => {
    setNameInput(props.initialLabelOptions.name);
  }, [props.initialLabelOptions.name]);

  const confirm = (): void => {
    props.onConfirm({
      color: color,
      name: nameInput.trim(),
    });
  };

  const onColorPickerChange = (_color: unknown, hex: string): void => {
    const newColor = new Color(hex);
    setColor(newColor);
    props.onColorChanged(newColor);
  };

  return (
    <FlexColumn style={{ width: "250px" }} $gap={10}>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Name</span>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onPressEnter={confirm}
          ref={nameInputRef}
        ></Input>
      </label>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Color</span>
        <div>
          <ColorPicker
            size="small"
            value={new AntdColor(color.getHexString())}
            onChange={onColorPickerChange}
            disabledAlpha={true}
            presets={DEFAULT_LABEL_COLOR_PRESETS}
          />
        </div>
      </label>
      <FlexRow style={{ marginLeft: "auto" }} $gap={10}>
        <Button onClick={props.onCancel}>Cancel</Button>
        <Button onClick={confirm} type="primary">
          {props.confirmText}
        </Button>
      </FlexRow>
    </FlexColumn>
  );
}
