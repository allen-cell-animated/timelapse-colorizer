import { ArrowRightOutlined } from "@ant-design/icons";
import { Dropdown, MenuProps, Space } from "antd";
import React, { ReactElement, useContext, useRef } from "react";
import { DropdownSVG } from "../assets";
import { FlexRowAlignCenter } from "../styles/utils";
import { AppThemeContext } from "./AppStyle";
import styled from "styled-components";

const UnstyledButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  /* outline: inherit; */
  color: inherit;
  text-align: left;
`;

export default function HelpDropdown(): ReactElement {
  const dropdownContainer = useRef<HTMLDivElement>(null);
  const theme = useContext(AppThemeContext);

  const items: MenuProps["items"] = [
    {
      key: "issues",
      label: (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/allen-cell-animated/nucmorph-colorizer/issues"
        >
          <Space>
            Report an issue
            <ArrowRightOutlined />
          </Space>
        </a>
      ),
    },
  ];

  return (
    <div ref={dropdownContainer}>
      <Dropdown
        menu={{ items }}
        getPopupContainer={dropdownContainer.current ? () => dropdownContainer.current! : undefined}
        trigger={["click", "hover"]}
      >
        <UnstyledButton>
          <a onClick={(e) => e.preventDefault()} style={{ fontSize: theme.font.size.label }} role="tab">
            <FlexRowAlignCenter $gap={6}>
              Help
              <DropdownSVG style={{ marginTop: "2px" }} />
            </FlexRowAlignCenter>
          </a>
        </UnstyledButton>
      </Dropdown>
    </div>
  );
}
