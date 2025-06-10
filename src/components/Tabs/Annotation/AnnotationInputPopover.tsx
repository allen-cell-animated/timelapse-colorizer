import { DeleteOutlined } from "@ant-design/icons";
import { AutoComplete, Card } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { FlexColumn, FlexRow } from "../../../styles/utils";

import { LabelType } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import IconButton from "../../IconButton";

type AnnotationInputPopoverProps = {
  annotationState: AnnotationState;
  anchorPositionPx: [number, number];
};

const CARD_WIDTH_PX = 200;

const StyledCard = styled(Card)`
  position: relative;
  // Hard-coded values used instead of transform/translate to ensure that the
  // card aligns with pixel grid.
  left: -${CARD_WIDTH_PX / 2}px;
  width: ${CARD_WIDTH_PX}px;
  bottom: -20px;
  z-index: 1;
  & .ant-card-body {
    padding: 8px;
    padding-top: 6px;
  }
  &&& * {
    // Fixes a bug where the input popover's contents would persist when the
    // popover was hidden.
    transition: all 0.2s, visibility 0s;
  }
`;

export default function AnnotationInputPopover(props: AnnotationInputPopoverProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const {
    lastClickedId,
    currentLabelIdx,
    data: annotationData,
    isAnnotationModeEnabled,
    // The range of ids that are currently being edited. `null` if no range is
    // being edited, in which case the popover is hidden.
    activeEditRange,
    clearActiveEditRange,
  } = props.annotationState;

  const [inputValue, setInputValue] = useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);

  const originalValueRef = React.useRef<string | null>(null);
  const lastActiveEditRangeRef = useRef(props.annotationState.activeEditRange);
  const lastLabelIdxRef = useRef(props.annotationState.currentLabelIdx);
  const lastLabelCountRef = useRef(props.annotationState.data.getLabels().length);
  // During editing, values are live-updated in annotations as the user types.
  // To prevent the in-progress input value from appearing in the autocomplete
  // options list, we update the options only when editing starts.
  const originalOptionsRef = useRef<{ value: string; label: string }[]>([]);

  const hasValidData =
    isAnnotationModeEnabled && activeEditRange !== null && lastClickedId !== null && currentLabelIdx !== null;

  const saveInputValue = (labelIdx: number, range: number[]): void => {
    const newValue = inputValue.trim();
    if (newValue.length === 0) {
      props.annotationState.removeLabelOnIds(labelIdx, range);
    } else {
      props.annotationState.setLabelValueOnIds(labelIdx, range, newValue);
    }
  };

  //// Prop update handlers ////

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.style.left = `${props.anchorPositionPx[0] + 10}px`;
      anchorRef.current.style.top = `${props.anchorPositionPx[1] + 10}px`;
    }
  }, [props.anchorPositionPx]);

  // Reset the input value when a new range is selected for editing.
  useEffect(() => {
    // If we were previously editing something, save the changes. Skip if the
    // label was deleted.
    if (lastActiveEditRangeRef.current !== activeEditRange) {
      const hasLabelBeenDeleted = lastLabelCountRef.current > annotationData.getLabels().length;
      if (lastActiveEditRangeRef.current !== null && lastLabelIdxRef.current !== null && !hasLabelBeenDeleted) {
        saveInputValue(lastLabelIdxRef.current, lastActiveEditRangeRef.current);
      }
      lastActiveEditRangeRef.current = activeEditRange;
    }
    if (currentLabelIdx !== null && lastClickedId !== null) {
      const value = annotationData.getValueFromId(currentLabelIdx, lastClickedId) ?? "";
      setInputValue(value);
      originalValueRef.current = value;
      // Update the autocomplete options only when editing starts.
      const labelData = annotationData.getLabels()[currentLabelIdx];
      originalOptionsRef.current = Array.from(labelData.valueToIds.keys()).map((value) => ({ value, label: value }));
    }
    lastLabelIdxRef.current = currentLabelIdx;
    lastLabelCountRef.current = annotationData.getLabels().length;
  }, [activeEditRange]);

  // Focus the input when the popover is visible.
  useEffect(() => {
    if (hasValidData && inputContainerRef.current) {
      // Adding a slight delay fixes a bug where the input is not consistently
      // focused
      setTimeout(() => {
        const inputElement = inputContainerRef.current!.querySelector("input");
        inputElement?.focus();
        inputElement?.select();
      }, 10);
    }
  }, [hasValidData]);

  //// Interaction handlers ////

  const handleInputChange = (value: string): void => {
    // Editing the input value directly updates the label value in the annotation state.
    if (currentLabelIdx === null || activeEditRange === null) {
      return;
    }
    // Validate input based on label type.
    const labelData = props.annotationState.data.getLabels()[currentLabelIdx];
    if (labelData.options.type === LabelType.INTEGER) {
      value = value.replaceAll(/[^0-9]/g, "");
      if (value.length === 0) {
        setInputValue("");
        // Don't allow empty values to be set on the label for integers.
        return;
      }
    }
    setInputValue(value);
    props.annotationState.setLabelValueOnIds(currentLabelIdx, activeEditRange, value);
  };

  const handleDelete = (): void => {
    if (currentLabelIdx !== null && activeEditRange !== null) {
      props.annotationState.removeLabelOnIds(currentLabelIdx, activeEditRange);
    }
    setInputValue("");
    clearActiveEditRange();
  };

  // Reset to original value and close the popover when escape is pressed.
  const handleEscape = useCallback((): void => {
    if (originalValueRef.current !== null && hasValidData) {
      setInputValue(originalValueRef.current);
      props.annotationState.setLabelValueOnIds(currentLabelIdx, activeEditRange, originalValueRef.current);
    }
    clearActiveEditRange();
  }, [hasValidData]);

  const handleKeyInput: React.KeyboardEventHandler = (e): void => {
    if (currentLabelIdx === null || activeEditRange === null) {
      return;
    }
    if (e.key === "Enter") {
      // Save the input value when Enter is pressed.
      saveInputValue(currentLabelIdx, activeEditRange);
      clearActiveEditRange();
    }
    if (e.key === "Escape") {
      handleEscape();
    }
  };

  // TODO: Use the actual popover component from Antd to get the little arrow at
  // the bottom? This requires visibility to be toggled every time anchor
  // position prop changes, or else the popover will not move with the anchor
  // element.

  // TODO: The annotation state uses the last valid value of a label to
  // determine its next default value. There is a bug where, if using the
  // backspace key to erase the input character-by-character, the last valid
  // value is something unexpected. For example, if erasing a string "1004"
  // character-by-character, the last valid value before the empty string is "1"
  // which makes the next default value also "1". For auto-incrementing
  // integers, this can be confusing (jumping from 1004 to 1 instead of to
  // 1005). This can be fixed by updating the AnnotationData API to include a
  // setter for the last value field.

  const labelData = hasValidData ? annotationData.getLabels()[currentLabelIdx] : undefined;
  const showOptions = labelData ? labelData.options.type === LabelType.CUSTOM : false;
  const editCount = activeEditRange?.length ?? 0;

  return (
    <div ref={anchorRef} style={{ position: "absolute", width: "1px", height: "1px", zIndex: 102 }}>
      <StyledCard size="small" style={{ visibility: hasValidData ? "visible" : "hidden" }}>
        <FlexColumn>
          <span style={{ fontSize: theme.font.size.labelSmall, color: theme.color.text.hint, marginTop: "0" }}>
            Editing {editCount} object{editCount > 1 ? "s" : ""}
          </span>
          <FlexRow $gap={6} ref={inputContainerRef}>
            <AutoComplete
              size="small"
              defaultValue={inputValue}
              style={{ pointerEvents: "auto", width: "150px" }}
              value={inputValue}
              options={showOptions ? originalOptionsRef.current : []}
              open={showOptions ? undefined : false}
              onChange={handleInputChange}
              onInputKeyDown={handleKeyInput}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            ></AutoComplete>
            <IconButton type="link" onClick={handleDelete}>
              <DeleteOutlined />
            </IconButton>
          </FlexRow>
        </FlexColumn>
      </StyledCard>
    </div>
  );
}
