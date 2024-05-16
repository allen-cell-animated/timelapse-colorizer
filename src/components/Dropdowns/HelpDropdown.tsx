import { Button } from "antd";
import React, { ReactElement, useState } from "react";
import styled, { css } from "styled-components";

import { getDisplayDateString } from "../../colorizer/utils/math_utils";
import { VisuallyHidden } from "../../styles/utils";

import StyledModal from "../Modals/StyledModal";
import AccessibleDropdown from "./AccessibleDropdown";
import DropdownItemList from "./DropdownItemList";

const listButtonStyling = css`
  border-radius: 4px;
  padding: 3px 12px;
  color: var(--color-text-primary);
  text-align: left;

  &&&:hover,
  &:focus {
    background-color: var(--color-dropdown-hover);
    color: var(--color-text-primary);
  }

  &:focus-visible {
    outline: 4px solid var(--color-focus-shadow) !important;
  }
`;

const StyledLink = styled.a`
  ${listButtonStyling}
`;

const StyledButton = styled(Button)`
  ${listButtonStyling}
`;

export default function HelpDropdown(): ReactElement {
  const [showVersionModal, setShowVersionModal] = useState(false);

  const dropdownContent = (
    <DropdownItemList>
      <StyledLink
        className="button"
        href="https://github.com/allen-cell-animated/nucmorph-colorizer"
        rel="noopener noreferrer"
        target="_blank"
        role="link"
      >
        Visit GitHub repository
        <VisuallyHidden>(opens in new tab)</VisuallyHidden>
      </StyledLink>
      <StyledLink
        className="button"
        href="https://github.com/allen-cell-animated/nucmorph-colorizer/issues"
        rel="noopener noreferrer"
        target="_blank"
        role="link"
      >
        Report an issue
        <VisuallyHidden>(opens in new tab)</VisuallyHidden>
      </StyledLink>
      <StyledButton type="text" onClick={() => setShowVersionModal(true)}>
        Version info
      </StyledButton>
    </DropdownItemList>
  );

  return (
    <div>
      <AccessibleDropdown
        dropdownContent={dropdownContent}
        buttonText={"Help"}
        buttonType="default"
        showTooltip={false}
        buttonStyle={{ width: "fit-content" }}
      />
      <StyledModal
        open={showVersionModal}
        title="Version info"
        onCancel={() => setShowVersionModal(false)}
        footer={<Button onClick={() => setShowVersionModal(false)}>Close</Button>}
      >
        <p>Timelapse Colorizer v{APP_VERSION}</p>
        <p>Last built on {getDisplayDateString(new Date(BUILD_TIME_UTC))}</p>
      </StyledModal>
    </div>
  );
}
