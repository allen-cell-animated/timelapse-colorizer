import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Dropdown, MenuProps, Space } from "antd";
import React, { ReactElement, useRef } from "react";
import styled from "styled-components";

import { DropdownSVG } from "../assets";
import { FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";

const HelpButton = styled(Button)``;

export default function HelpDropdown(): ReactElement {
  const dropdownContainer = useRef<HTMLDivElement>(null);

  const items: MenuProps["items"] = [
    {
      key: "https://github.com/allen-cell-animated/nucmorph-colorizer/issues",
      label: (
        <Space>
          <p>
            Report an issue
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </p>
          <ArrowRightOutlined />
        </Space>
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
    <ConfigProvider theme={{ components: { Button: { paddingInline: 12 } } }}>
      <div ref={dropdownContainer}>
        <Dropdown
          menu={menuConfig}
          getPopupContainer={dropdownContainer.current ? () => dropdownContainer.current! : undefined}
          trigger={["click", "hover"]}
        >
          <HelpButton type="default" style={{}}>
            <a onClick={(e) => e.preventDefault()} role="tab">
              <FlexRowAlignCenter $gap={4}>
                Help
                {/* TODO: At 14x14, this doesn't match with the labeled dropdowns */}
                <DropdownSVG style={{ width: "11px", height: "11px" }} />
              </FlexRowAlignCenter>
            </a>
          </HelpButton>
        </Dropdown>
      </div>
    </ConfigProvider>
  );
}
