import { Button, Checkbox, Input, InputRef, Radio } from "antd";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Color, ColorRepresentation } from "three";

import { FlexColumn, FlexRow } from "../../../styles/utils";
import { threeToAntColor } from "../../../utils/color_utils";

import {
  CSV_COL_ID,
  CSV_COL_TIME,
  CSV_COL_TRACK,
  DEFAULT_ANNOTATION_LABEL_COLORS,
  LabelOptions,
  LabelType,
} from "../../../colorizer/AnnotationData";
import { AppThemeContext, Z_INDEX_POPOVER } from "../../AppStyle";
import WrappedColorPicker from "../../Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import { TooltipWithSubtitle } from "../../Tooltips/TooltipWithSubtitle";

const DEFAULT_LABEL_COLOR_PRESETS = [
  {
    label: "Presets",
    colors: DEFAULT_ANNOTATION_LABEL_COLORS,
  },
];

const enum CreateLabelFormHtmlIds {
  NAME_INPUT = "-create-label-name-input",
  COLOR_PICKER = "-create-label-color-picker",
  LABEL_TYPE_RADIO_GROUP = "-create-label-type-radio-group",
  AUTO_INCREMENT_CHECKBOX = "-create-label-auto-increment-checkbox",
}

type CreateLabelFormProps = {
  baseId: string;
  initialLabelOptions: LabelOptions;
  onConfirm: (options: Partial<LabelOptions>) => void;
  onCancel: () => void;
  onColorChanged?: (color: Color) => void;
  onColorPickerOpenChange?: (open: boolean) => void;
  colorPickerOpen?: boolean;
  confirmText?: string;
  focusNameInput?: boolean;
  zIndex?: number;
  allowTypeSelection?: boolean;
};

const defaultProps = {
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

const isMetadataColumnName = (name: string): boolean => {
  return name === CSV_COL_ID || name === CSV_COL_TIME || name === CSV_COL_TRACK;
};

export default function CreateLabelForm(inputProps: CreateLabelFormProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const { baseId } = props;

  const [colorPickerOpenState, setColorPickerOpenState] = useState(false);
  const onColorPickerOpenChange = (open: boolean): void => {
    setColorPickerOpenState(open);
    props.onColorPickerOpenChange?.(open);
  };
  const colorPickerOpen = props.colorPickerOpen ?? colorPickerOpenState;

  const [labelType, setLabelType] = useState<LabelType>(props.initialLabelOptions.type);
  const autoIncrementContainerRef = useRef<HTMLDivElement>(null);
  const [autoIncrement, setAutoIncrement] = useState(props.initialLabelOptions.autoIncrement);
  const [color, setColor] = useState(props.initialLabelOptions.color);
  const [nameInput, setNameInput] = useState(props.initialLabelOptions.name);
  const nameInputRef = useRef<InputRef>(null);

  const theme = useContext(AppThemeContext);

  const [nameInputError, setNameInputError] = useState("");

  useEffect(() => {
    if (nameInputRef.current && props.focusNameInput) {
      nameInputRef.current.focus({ preventScroll: true });
      nameInputRef.current.select();
    }
  }, [props.focusNameInput]);

  const confirm = (): void => {
    // Perform validation step
    const newName = nameInput.trim();
    if (newName === "") {
      setNameInputError("Annotation name cannot be empty.");
      return;
    } else if (isMetadataColumnName(newName)) {
      setNameInputError(`Annotation name '${newName}' is reserved for metadata. Please choose a different name.`);
      return;
    }

    props.onConfirm({
      color: color,
      name: newName,
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
        <SettingsItem
          label="Name"
          labelStyle={{ margin: "2px 0 auto 0" }}
          htmlFor={baseId + CreateLabelFormHtmlIds.NAME_INPUT}
        >
          <Input
            id={baseId + CreateLabelFormHtmlIds.NAME_INPUT}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onPressEnter={confirm}
            ref={nameInputRef}
          ></Input>
          {nameInputError && <p style={{ color: theme.color.text.error }}>{nameInputError}</p>}
        </SettingsItem>
        <SettingsItem label="Color" htmlFor={baseId + CreateLabelFormHtmlIds.COLOR_PICKER}>
          <WrappedColorPicker
            id={baseId + CreateLabelFormHtmlIds.COLOR_PICKER}
            size="small"
            value={threeToAntColor(color)}
            onChange={onColorPickerChange}
            disabledAlpha={true}
            presets={DEFAULT_LABEL_COLOR_PRESETS}
            onOpenChange={onColorPickerOpenChange}
            open={colorPickerOpen}
          />
        </SettingsItem>
        <SettingsItem
          label="Type"
          labelStyle={{ marginBottom: "auto" }}
          htmlFor={baseId + CreateLabelFormHtmlIds.LABEL_TYPE_RADIO_GROUP}
        >
          {props.allowTypeSelection ? (
            <Radio.Group
              id={baseId + CreateLabelFormHtmlIds.LABEL_TYPE_RADIO_GROUP}
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
            <p
              style={{ margin: 0, color: theme.color.text.hint }}
              id={baseId + CreateLabelFormHtmlIds.LABEL_TYPE_RADIO_GROUP}
            >
              {labelTypeToDisplayName[labelType]}
            </p>
          )}
        </SettingsItem>
        {labelType === LabelType.INTEGER && (
          <SettingsItem>
            <TooltipWithSubtitle
              trigger={["hover", "focus"]}
              title="Increments the value on each click"
              subtitle="Hold Ctrl to reuse last value"
              placement="right"
              getPopupContainer={() => autoIncrementContainerRef.current ?? document.body}
            >
              <div ref={autoIncrementContainerRef} style={{ width: "fit-content" }}>
                <Checkbox
                  id={baseId + CreateLabelFormHtmlIds.AUTO_INCREMENT_CHECKBOX}
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
