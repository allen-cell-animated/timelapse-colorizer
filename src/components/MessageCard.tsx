import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React, { ReactElement } from "react";

import { FlexRow } from "../styles/utils";

type MessageCardType = "info" | "warning" | "error" | "success";

type MessageCardProps = {
  type?: MessageCardType;
};

const defaultProps: MessageCardProps = {
  type: "info",
};

export default function MessageCard(props: React.PropsWithChildren<MessageCardProps>): ReactElement {
  const { type } = { ...defaultProps, ...props } as Required<MessageCardProps>;

  const cardStyle = {
    info: { backgroundColor: "var(--color-alert-info-fill)", borderColor: "var(--color-alert-info-border)" },
    warning: { backgroundColor: "var(--color-alert-warning-fill)", borderColor: "var(--color-alert-warning-border)" },
    error: { backgroundColor: "var(--color-alert-error-fill)", borderColor: "var(--color-alert-error-border)" },
    success: { backgroundColor: "var(--color-alert-success-fill)", borderColor: "var(--color-alert-success-border)" },
  }[type];

  const cardIcon = {
    info: <InfoCircleOutlined style={{ color: "var(--color-text-info)", fontSize: "var(--font-size-label)" }} />,
    warning: <WarningOutlined style={{ color: "var(--color-text-warning)", fontSize: "var(--font-size-label)" }} />,
    error: (
      <ExclamationCircleOutlined style={{ color: "var(--color-text-error)", fontSize: "var(--font-size-label)" }} />
    ),
    success: <CheckCircleOutlined style={{ color: "var(--color-text-success)", fontSize: "var(--font-size-label)" }} />,
  };

  return (
    <Card size="small" style={{ ...cardStyle }}>
      <FlexRow $gap={10}>
        <div style={{ marginTop: "2px" }}>{cardIcon[type]}</div>
        {props.children}
      </FlexRow>
    </Card>
  );
}
