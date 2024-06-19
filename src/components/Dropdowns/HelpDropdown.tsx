import { Button } from "antd";
import React, { ReactElement, useState } from "react";
import styled, { css } from "styled-components";

import { getBuildDisplayDateString } from "../../colorizer/utils/math_utils";
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
        href="https://github.com/allen-cell-animated/timelapse-colorizer"
        rel="noopener noreferrer"
        target="_blank"
        role="link"
      >
        Visit GitHub repository
        <VisuallyHidden>(opens in new tab)</VisuallyHidden>
      </StyledLink>
      <StyledLink
        className="button"
        href="https://github.com/allen-cell-animated/timelapse-colorizer/issues"
        rel="noopener noreferrer"
        target="_blank"
        role="link"
      >
        Report an issue
        <VisuallyHidden>(opens in new tab)</VisuallyHidden>
      </StyledLink>
      <StyledLink
        className="button"
        href="https://forum.image.sc/tag/timelapse-feature-explorer"
        rel="noopener noreferrer"
        target="_blank"
        role="link"
      >
        Support Forum
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
        <p>Timelapse Feature Explorer v{import.meta.env.VITE_APP_VERSION}</p>
        <p>Last built on {getBuildDisplayDateString()}</p>
      </StyledModal>
    </div>
  );
}
