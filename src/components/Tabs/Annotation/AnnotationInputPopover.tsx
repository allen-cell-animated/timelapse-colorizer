import { DeleteOutlined } from "@ant-design/icons";
import { Card, Input, InputRef } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { FlexRow } from "../../../styles/utils";

import IconButton from "../../IconButton";

type AnnotationInputPopoverProps = {
  annotationState: AnnotationState;
  anchorPositionPx: [number, number];
};

const InputWrapper = styled(Card)`
  position: relative;
  width: 200px;
  & .ant-card-body {
    padding: 4px;
  }
  z-index: 1;
`;

export default function AnnotationInputPopover(props: AnnotationInputPopoverProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);

  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<InputRef>(null);

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
      inputRef.current?.focus({ preventScroll: true });
    } else {
      setVisible(false);
    }
  }, [activeEditRange]);

  const handleInputConfirm = () => {
    const lastEditedRange = props.annotationState.activeEditRange;
    console.log("lastEditedRange", lastEditedRange);
    if (lastEditedRange !== null && currentLabelIdx !== null) {
      const newValue = inputValue;
      props.annotationState.setLabelValueOnIds(currentLabelIdx, lastEditedRange, newValue);
    }
    setVisible(false);
    clearActiveEditRange();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Editing the input value directly updates the label value in the annotation state.
    if (currentLabelIdx !== null && activeEditRange !== null) {
      setInputValue(e.target.value);
      props.annotationState.setLabelValueOnIds(currentLabelIdx, activeEditRange, e.target.value);
    }
  };

  const handleDelete = () => {
    if (currentLabelIdx !== null && activeEditRange !== null) {
      props.annotationState.removeLabelOnIds(currentLabelIdx, activeEditRange);
    }
    setVisible(false);
    clearActiveEditRange();
  };

  // TODO: Pressing escape should reset the input value to the original value.

  return (
    <div ref={anchorRef} style={{ position: "absolute", width: "1px", height: "1px", zIndex: 102 }}>
      <InputWrapper size="small" style={{ visibility: visible ? "visible" : "hidden" }}>
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
      </InputWrapper>
    </div>
  );
}
