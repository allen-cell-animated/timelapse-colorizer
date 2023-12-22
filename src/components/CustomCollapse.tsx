import { Collapse } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled from "styled-components";

type CustomCollapseProps = {
  label: string;
};

const CustomCollapseElement = styled(Collapse)`
  & .ant-collapse-header {
    display: flex;
    flex-direction: row;
    align-items: center !important;
  }
`;

/**
 * Wrapper around Antd's collapse, with a nicer API when creating single collapse elements.
 */
export default function CustomCollapse(props: PropsWithChildren<CustomCollapseProps>): ReactElement {
  return (
    <CustomCollapseElement
      size="small"
      ghost
      defaultActiveKey={"1"}
      items={[{ key: "1", label: <h3 style={{ margin: 0 }}>{props.label}</h3>, children: props.children }]}
    />
  );
}
