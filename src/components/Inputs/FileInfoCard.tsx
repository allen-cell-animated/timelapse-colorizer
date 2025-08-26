import { CloseOutlined, PaperClipOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode } from "react";

import { FlexColumn, FlexRow } from "../../styles/utils";

import IconButton from "../IconButton";
import MessageCard from "../MessageCard";

type FileInfoCardProps = {
  fileName: string;
  errorText?: ReactNode;
  warningText?: ReactNode;
  onClickClear: () => void;
};

const defaultProps: Partial<FileInfoCardProps> = {};

export default function FileInfoCard(inputProps: PropsWithChildren<FileInfoCardProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  return (
    <>
      <Card
        size="small"
        title={
          <FlexRow $gap={6}>
            <PaperClipOutlined />
            <b>{props.fileName}</b>
          </FlexRow>
        }
        extra={
          <IconButton type="text" onClick={props.onClickClear}>
            <CloseOutlined />
          </IconButton>
        }
      >
        <FlexColumn $gap={6}>
          {props.errorText && <MessageCard type="error">{props.errorText}</MessageCard>}
          {props.warningText && <MessageCard type="warning">{props.warningText}</MessageCard>}
          {props.children}
        </FlexColumn>
      </Card>
    </>
  );
}
