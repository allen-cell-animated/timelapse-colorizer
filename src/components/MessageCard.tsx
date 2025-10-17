import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, InfoCircleFilled } from "@ant-design/icons";
import { Card } from "antd";
import React, { ReactElement, useContext } from "react";

import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRow } from "src/styles/utils";

type MessageCardType = "info" | "warning" | "error" | "success";

type MessageCardProps = {
  type?: MessageCardType;
};

const defaultProps: MessageCardProps = {
  type: "info",
};

/**
 * A styled card component that displays a message with an icon. Use for alerts,
 * warnings, errors, and success messages.
 */
export default function MessageCard(props: React.PropsWithChildren<MessageCardProps>): ReactElement {
  const { type } = { ...defaultProps, ...props } as Required<MessageCardProps>;

  const theme = useContext(AppThemeContext);

  const cardStyle = {
    backgroundColor: theme.color.alert.fill[type],
    borderColor: theme.color.alert.border[type],
  };
  const cardIconStyle = {
    color: theme.color.text[type],
    fontSize: theme.font.size.label,
  };
  const cardIcon = {
    info: <InfoCircleFilled style={cardIconStyle} />,
    warning: <ExclamationCircleFilled style={cardIconStyle} />,
    error: <CloseCircleFilled style={cardIconStyle} />,
    success: <CheckCircleFilled style={cardIconStyle} />,
  }[type];

  return (
    <Card size="small" style={{ ...cardStyle }}>
      <FlexRow $gap={10}>
        <div style={{ marginTop: "2px" }}>{cardIcon}</div>
        {props.children}
      </FlexRow>
    </Card>
  );
}
