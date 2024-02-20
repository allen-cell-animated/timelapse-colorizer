import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Dropdown, MenuProps, Space } from "antd";
import React, { ReactElement, useContext, useRef } from "react";
import styled from "styled-components";

import { DropdownSVG } from "../assets";
import { FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";

const HelpButton = styled(Button)`
  padding-top: 0;
`;

export default function HelpDropdown(): ReactElement {
  const dropdownContainer = useRef<HTMLDivElement>(null);
  const theme = useContext(AppThemeContext);

  const items: MenuProps["items"] = [
    {
      key: "https://github.com/allen-cell-animated/nucmorph-colorizer/issues",
      label: (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/allen-cell-animated/nucmorph-colorizer/issues"
        >
          <Space>
            <p>
              Report an issue
              <VisuallyHidden>(opens in new tab)</VisuallyHidden>
            </p>
            <ArrowRightOutlined />
          </Space>
        </a>
      ),
    },
  ];
  const menuConfig: MenuProps = {
    items,
    // Makes dropdown accessible via keyboard nav + enter key
    onClick: (e) => {
      window.open(e.key, "_blank", "noopener noreferrer");
    },
  };

  return (
    <div ref={dropdownContainer}>
      <Dropdown
        menu={menuConfig}
        getPopupContainer={dropdownContainer.current ? () => dropdownContainer.current! : undefined}
        trigger={["click", "hover"]}
      >
        <HelpButton type="default" style={{}}>
          <a onClick={(e) => e.preventDefault()} style={{ fontSize: theme.font.size.label }} role="tab">
            <FlexRowAlignCenter $gap={6}>
              Help
              <DropdownSVG style={{ marginTop: "2px" }} />
            </FlexRowAlignCenter>
          </a>
        </HelpButton>
      </Dropdown>
    </div>
  );
}
