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
    outline: 1px solid transparent;
    border-radius: 6px !important;
    transition: outline 0s !important;
  }

  & .ant-collapse-header:focus:not(:focus-visible) {
    // Override "outline: none" which causes brief flicker
    outline: 1px solid transparent !important;
  }

  & .ant-collapse-header:focus-visible {
    // Tab selection
    outline: 4px solid var(--color-focus-shadow) !important;
  }

  & .ant-collapse-header:hover:not(:active) {
    h3,
    svg {
      color: var(--color-collapse-hover);
      fill: var(--color-collapse-hover);
    }
  }

  & .ant-collapse-header:active {
    h3,
    svg {
      color: var(--color-collapse-active);
      fill: var(--color-collapse-active);
    }
  }
`;

/**
 * Wrapper around Antd's collapse, with a nicer API when creating single collapse elements.
 */
export default function CustomCollapse(props: PropsWithChildren<CustomCollapseProps>): ReactElement {
  return (
    // TODO: This doesn't respond to tab + space bar input, which is an accessibility issue.
    // Not sure if this can be added without rewriting the Collapse component.
    <CustomCollapseElement
      size="small"
      ghost
      defaultActiveKey={"1"}
      items={[{ key: "1", label: <h3 style={{ margin: 0 }}>{props.label}</h3>, children: props.children }]}
    />
  );
}
