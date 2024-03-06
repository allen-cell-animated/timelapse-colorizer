import React, { ReactElement } from "react";
import styled from "styled-components";

import { VisuallyHidden } from "../../styles/utils";

import AccessibleDropdown from "./AccessibleDropdown";
import DropdownItemList from "./DropdownItemList";

const StyledLink = styled.a`
  border-radius: 4px;
  padding: 3px 12px;
  color: var(--color-text-primary);

  &:hover,
  &:focus {
    background-color: var(--color-dropdown-hover);
    color: var(--color-text-primary);
  }

  &:focus-visible {
    outline: 4px solid var(--color-focus-shadow) !important;
  }
`;

export default function HelpDropdown(): ReactElement {
  const dropdownContent = (
    <DropdownItemList>
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
