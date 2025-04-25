import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, ConfigProvider, Input, InputRef } from "antd";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Color } from "three";

import { FlexColumn, FlexRow } from "../../../styles/utils";

import { LabelOptions } from "../../../colorizer/AnnotationData";
import { Z_INDEX_POPOVER } from "../../AppStyle";
import { DEFAULT_LABEL_COLOR_PRESETS } from "./LabelEditControls";

type CreateLabelFormProps = {
  initialLabelOptions: LabelOptions;
  onConfirm: (options: LabelOptions) => void;
  onCancel: () => void;
  onColorChanged?: (color: Color) => void;
  confirmText?: string;
  focusNameInput?: boolean;
  zIndex?: number;
};

const defaultProps: Partial<CreateLabelFormProps> = {
  confirmText: "Create",
  focusNameInput: true,
  onColorChanged: () => {},
  zIndex: Z_INDEX_POPOVER,
};

export default function CreateLabelForm(inputProps: CreateLabelFormProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CreateLabelFormProps>;

  const [color, setColor] = useState(props.initialLabelOptions.color);
  const [nameInput, setNameInput] = useState(props.initialLabelOptions.name);
  const nameInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (nameInputRef.current && props.focusNameInput) {
      console.log("Focusing name input");
      nameInputRef.current.focus();
    }
  }, [props.focusNameInput]);

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
        {/* TODO: This is a fix for a bug where the ColorPicker's popover cannot have its
         * containing element set. This means that we have to manually set the zIndex
         * if it's in a modal or other element with a higher zIndex.
         */}
        <ConfigProvider theme={{ components: { Popover: { zIndexPopup: props.zIndex } } }}>
          <div>
            <ColorPicker
              size="small"
              value={new AntdColor(color.getHexString())}
              onChange={onColorPickerChange}
              disabledAlpha={true}
              presets={DEFAULT_LABEL_COLOR_PRESETS}
            />
          </div>
        </ConfigProvider>
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
