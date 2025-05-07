import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, Checkbox, ColorPicker, ConfigProvider, Input, InputRef, Radio } from "antd";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Color, ColorRepresentation } from "three";

import { FlexColumn, FlexRow } from "../../../styles/utils";

import { LabelOptions, LabelType } from "../../../colorizer/AnnotationData";
import { AppThemeContext, Z_INDEX_POPOVER } from "../../AppStyle";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { TooltipWithSubtitle } from "../../Tooltips/TooltipWithSubtitle";
import { DEFAULT_LABEL_COLOR_PRESETS } from "./LabelEditControls";

type CreateLabelFormProps = {
  initialLabelOptions: LabelOptions;
  onConfirm: (options: Partial<LabelOptions>) => void;
  onCancel: () => void;
  onColorChanged?: (color: Color) => void;
  confirmText?: string;
  focusNameInput?: boolean;
  zIndex?: number;
  allowTypeSelection?: boolean;
};

const defaultProps: Partial<CreateLabelFormProps> = {
  confirmText: "Create",
  focusNameInput: true,
  onColorChanged: () => {},
  zIndex: Z_INDEX_POPOVER,
  allowTypeSelection: true,
};

const labelTypeToDisplayName: Record<LabelType, string> = {
  [LabelType.BOOLEAN]: "Boolean",
  [LabelType.INTEGER]: "Integer",
  [LabelType.CUSTOM]: "Custom",
};

export default function CreateLabelForm(inputProps: CreateLabelFormProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CreateLabelFormProps>;

  const [labelType, setLabelType] = useState<LabelType>(props.initialLabelOptions.type);
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [color, setColor] = useState(props.initialLabelOptions.color);
  const [nameInput, setNameInput] = useState(props.initialLabelOptions.name);
  const nameInputRef = useRef<InputRef>(null);

  const theme = useContext(AppThemeContext);

  useEffect(() => {
    if (nameInputRef.current && props.focusNameInput) {
      nameInputRef.current.focus({ preventScroll: true });
    }
  }, [props.focusNameInput]);

  const confirm = (): void => {
    props.onConfirm({
      color: color,
      name: nameInput.trim(),
      type: labelType,
      autoIncrement: autoIncrement,
    });
  };

  const onColorPickerChange = (_color: unknown, hex: string): void => {
    const newColor = new Color(hex as ColorRepresentation);
    setColor(newColor);
    props.onColorChanged(newColor);
  };

  return (
    <FlexColumn style={{ width: "300px" }} $gap={10}>
      <SettingsContainer gapPx={8}>
        <SettingsItem label="Name">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onPressEnter={confirm}
            ref={nameInputRef}
          ></Input>
        </SettingsItem>
        <SettingsItem label="Color">
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
        </SettingsItem>
        <SettingsItem label="Type" labelStyle={{ marginBottom: "auto" }}>
          {props.allowTypeSelection ? (
            <Radio.Group
              value={labelType}
              onChange={(e) => setLabelType(e.target.value)}
              style={{ width: "100%", position: "relative" }}
              disabled={!props.allowTypeSelection}
            >
              <Radio value={LabelType.BOOLEAN}>Boolean</Radio>
              <Radio value={LabelType.INTEGER}>Integer</Radio>
              <Radio value={LabelType.CUSTOM}>Custom</Radio>
            </Radio.Group>
          ) : (
            <p style={{ margin: 0, color: theme.color.text.hint }}>{labelTypeToDisplayName[labelType]}</p>
          )}
        </SettingsItem>
        {labelType === LabelType.INTEGER && (
          <SettingsItem label="">
            <TooltipWithSubtitle
              trigger={["hover", "focus"]}
              title="Increments the label value on each click"
              subtitle="Hold Ctrl to reuse last value"
              placement="right"
            >
              <div>
                <Checkbox
                  checked={autoIncrement}
                  onChange={(e) => {
                    setAutoIncrement(e.target.checked);
                  }}
                  disabled={labelType !== LabelType.INTEGER}
                  style={{ height: "fit-content" }}
                >
                  Auto-increment on click
                </Checkbox>
              </div>
            </TooltipWithSubtitle>
          </SettingsItem>
        )}
      </SettingsContainer>
      <FlexRow style={{ marginLeft: "auto" }} $gap={10}>
        <Button onClick={props.onCancel}>Cancel</Button>
        <Button onClick={confirm} type="primary">
          {props.confirmText}
        </Button>
      </FlexRow>
    </FlexColumn>
  );
}
