import { SaveOutlined } from "@ant-design/icons";
import { Card, Input } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { FlexRow } from "../../../styles/utils";

import { LabelType } from "../../../colorizer/AnnotationData";
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

  const { lastClickedId, currentLabelIdx, data: annotationData, isAnnotationModeEnabled } = props.annotationState;

  useEffect(() => {
    if (!isAnnotationModeEnabled) {
      setVisible(false);
    }
  });

  useEffect(() => {
    if (lastClickedId !== null && currentLabelIdx !== null && dataset) {
      const labelData = annotationData.getLabels()[currentLabelIdx];
      // Check if the last clicked ID is labeled-- this means that the ID(s)
      // were added to the label data instead of being removed.
      const isLastClickedIdLabeled = labelData.ids.has(lastClickedId);
      if (anchorRef.current && isLastClickedIdLabeled && labelData.options.type !== LabelType.BOOLEAN) {
        setInputValue(annotationData.getValueFromId(currentLabelIdx, lastClickedId) ?? "");
        anchorRef.current.style.left = `${props.anchorPositionPx[0] + 10}px`;
        anchorRef.current.style.top = `${props.anchorPositionPx[1] + 10}px`;
        setVisible(true);
      } else {
        setVisible(false);
      }
    } else {
      setVisible(false);
    }
  }, [lastClickedId, currentLabelIdx]);

  const handleInputConfirm = () => {
    const lastEditedRange = props.annotationState.lastEditedRange;
    console.log("lastEditedRange", lastEditedRange);
    if (lastEditedRange !== null && currentLabelIdx !== null) {
      const newValue = inputValue;
      props.annotationState.setLabelValueOnIds(currentLabelIdx, lastEditedRange, newValue);
    }
    setVisible(false);
  };

  return (
    <div ref={anchorRef} style={{ position: "absolute", width: "1px", height: "1px", zIndex: 102 }}>
      <InputWrapper size="small" style={{ visibility: visible ? "visible" : "hidden" }}>
        <FlexRow $gap={6}>
          {/* TODO: Change width based on field type? */}
          <Input
            size="small"
            defaultValue={inputValue}
            style={{ pointerEvents: "auto" }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleInputConfirm}
            width={"50px"}
          ></Input>
          <IconButton type="link" onClick={handleInputConfirm}>
            <SaveOutlined />
          </IconButton>
        </FlexRow>
      </InputWrapper>
    </div>
  );
}
