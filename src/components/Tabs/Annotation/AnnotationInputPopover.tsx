import { DeleteOutlined } from "@ant-design/icons";
import { Card, Input, InputRef } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useState } from "react";
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
  bottom: 90px;
  z-index: 1;
  & .ant-card-body {
    padding: 8px;
    padding-top: 6px;
  }
  & * {
    // Fixes a bug where the input popover's contents would persist when the
    // popover was hidden.
    transition: all 0.2s, visibility 0s;
  }
`;

export default function AnnotationInputPopover(props: AnnotationInputPopoverProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<InputRef>(null);

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
  const originalValueRef = React.useRef<string | null>(null);

  const hasValidData =
    isAnnotationModeEnabled && activeEditRange !== null && lastClickedId !== null && currentLabelIdx !== null;

  //// Prop update handlers ////

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.style.left = `${props.anchorPositionPx[0] + 10}px`;
      anchorRef.current.style.top = `${props.anchorPositionPx[1] + 10}px`;
    }
  }, [props.anchorPositionPx]);

  // Reset the input value when a new range is selected for editing.
  useEffect(() => {
    if (currentLabelIdx !== null && lastClickedId !== null) {
      const value = annotationData.getValueFromId(currentLabelIdx, lastClickedId) ?? "";
      setInputValue(value);
      originalValueRef.current = value;
    }
  }, [currentLabelIdx, lastClickedId]);

  // Focus the input when the popover is visible.
  useEffect(() => {
    if (hasValidData && inputRef.current) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [hasValidData]);

  //// Interaction handlers ////

  const handleInputConfirm = (): void => {
    const lastEditedRange = props.annotationState.activeEditRange;
    if (lastEditedRange !== null && currentLabelIdx !== null) {
      // Validate
      const newValue = inputValue;
      if (newValue.length === 0) {
        props.annotationState.removeLabelOnIds(currentLabelIdx, lastEditedRange);
      } else {
        props.annotationState.setLabelValueOnIds(currentLabelIdx, lastEditedRange, newValue);
      }
    }
    clearActiveEditRange();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // Editing the input value directly updates the label value in the annotation state.
    if (currentLabelIdx === null || activeEditRange === null) {
      return;
    }
    // Validate input based on label type.
    const labelData = props.annotationState.data.getLabels()[currentLabelIdx];
    let value = e.target.value;
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
    clearActiveEditRange();
  };

  // Reset to original value and close the popover when escape is pressed.
  const handleEscape = useCallback((): void => {
    if (originalValueRef.current !== null && hasValidData) {
      props.annotationState.setLabelValueOnIds(currentLabelIdx, activeEditRange, originalValueRef.current);
    }
    clearActiveEditRange();
  }, [hasValidData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        handleEscape();
      }
    };
    anchorRef.current?.addEventListener("keydown", handleKeyDown);
    return () => {
      anchorRef.current?.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleEscape]);

  // TODO: Use the actual popover component from Antd to get the little arrow at
  // the bottom? This requires visibility to be toggled every time anchor
  // position prop changes, or else the popover will not move with the anchor
  // element.

  const editCount = activeEditRange?.length ?? 0;

  return (
    <div ref={anchorRef} style={{ position: "absolute", width: "1px", height: "1px", zIndex: 102 }}>
      <StyledCard size="small" style={{ visibility: hasValidData ? "visible" : "hidden" }}>
        <FlexColumn>
          <span style={{ fontSize: theme.font.size.labelSmall, color: theme.color.text.hint, marginTop: "0" }}>
            Editing {editCount} object{editCount > 1 ? "s" : ""}
          </span>
          <FlexRow $gap={6}>
            {/* TODO: Resize input based on value? */}
            <Input
              ref={inputRef}
              size="small"
              defaultValue={inputValue}
              style={{ pointerEvents: "auto" }}
              value={inputValue}
              onChange={handleInputChange}
              onPressEnter={handleInputConfirm}
              width={"50px"}
            ></Input>
            <IconButton type="link" onClick={handleDelete}>
              <DeleteOutlined />
            </IconButton>
          </FlexRow>
        </FlexColumn>
      </StyledCard>
    </div>
  );
}
