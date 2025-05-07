import { DeleteOutlined } from "@ant-design/icons";
import { Card, Input, InputRef } from "antd";
import React, { ReactElement, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
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
  const dataset = useViewerStateStore((state) => state.dataset);

  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<InputRef>(null);

  const theme = useContext(AppThemeContext);

  const {
    lastClickedId,
    currentLabelIdx,
    data: annotationData,
    isAnnotationModeEnabled,
    activeEditRange,
    clearActiveEditRange,
  } = props.annotationState;

  useEffect(() => {
    if (!isAnnotationModeEnabled) {
      setVisible(false);
    }
  }, [isAnnotationModeEnabled]);

  useEffect(() => {
    if (activeEditRange === null || lastClickedId === null || currentLabelIdx === null || !dataset) {
      setVisible(false);
      return;
    }
    // Check if the last clicked ID is labeled-- this means that the ID(s)
    // were added to the label data instead of being removed.
    if (anchorRef.current && activeEditRange) {
      setInputValue(annotationData.getValueFromId(currentLabelIdx, lastClickedId) ?? "");
      anchorRef.current.style.left = `${props.anchorPositionPx[0] + 10}px`;
      anchorRef.current.style.top = `${props.anchorPositionPx[1] + 10}px`;
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [activeEditRange, lastClickedId, dataset]);

  // Focus the input when the popover is visible.
  useEffect(() => {
    if (visible && inputRef.current) {
      console.log("Focusing input", inputRef.current, inputRef);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [visible]);

  const handleInputConfirm = (): void => {
    const lastEditedRange = props.annotationState.activeEditRange;
    console.log("lastEditedRange", lastEditedRange);
    if (lastEditedRange !== null && currentLabelIdx !== null) {
      // Validate
      const newValue = inputValue;
      if (newValue.length === 0) {
        props.annotationState.removeLabelOnIds(currentLabelIdx, lastEditedRange);
      } else {
        props.annotationState.setLabelValueOnIds(currentLabelIdx, lastEditedRange, newValue);
      }
    }
    setVisible(false);
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
        // Don't allow empty values to be set on the label.
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
    setVisible(false);
    clearActiveEditRange();
  };

  // TODO: Pressing escape should reset the input value to the original value and close the popover.
  // TODO: Use the actual popover component from Antd?

  const editCount = activeEditRange?.length ?? 0;

  return (
    <div ref={anchorRef} style={{ position: "absolute", width: "1px", height: "1px", zIndex: 102 }}>
      <StyledCard size="small" style={{ visibility: visible ? "visible" : "hidden" }}>
        <FlexColumn>
          <span style={{ fontSize: theme.font.size.labelSmall, color: theme.color.text.hint, marginTop: "0" }}>
            Editing {editCount} object{editCount > 1 ? "s" : ""}
          </span>
          <FlexRow $gap={6}>
            {/* TODO: Change width based on field type? */}
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
