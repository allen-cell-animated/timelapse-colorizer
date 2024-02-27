import { ArrowRightOutlined } from "@ant-design/icons";
import { Space } from "antd";
import React, { ReactElement } from "react";

import { VisuallyHidden } from "../../styles/utils";

import AccessibleDropdown from "./AccessibleDropdown";
import { DropdownItem, DropdownItemList } from "./SelectionDropdown";

export default function HelpDropdown(): ReactElement {
  const makeOnButtonClick = (link: string) => {
    return () => {
      window.open(link, "_blank", "noopener noreferrer");
    };
  };

  const dropdownContent = (
    <DropdownItemList>
      <DropdownItem
        onClick={makeOnButtonClick("https://github.com/allen-cell-animated/nucmorph-colorizer/issues")}
        type={"text"}
      >
        <Space>
          <p>
            Report an issue
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </p>
          <ArrowRightOutlined />
        </Space>
      </DropdownItem>
    </DropdownItemList>
  );

  return (
    <AccessibleDropdown
      dropdownContent={dropdownContent}
      buttonText={"Help"}
      buttonType="default"
      showTooltip={false}
      buttonStyle={{ width: "fit-content" }}
    />
  );
}
