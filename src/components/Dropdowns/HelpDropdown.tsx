import { Button } from "antd";
import React, { type ReactElement, useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import styled, { css } from "styled-components";

import { getBuildDisplayDateString } from "src/colorizer/utils/math_utils";
import ShortcutKeyModal from "src/components/Modals/ShortcutKeyModal";
import StyledModal from "src/components/Modals/StyledModal";
import { INTERNAL_BUILD, ShortcutKeys } from "src/constants";
import { VisuallyHidden } from "src/styles/utils";

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

  & > span {
    /* Fixes a bug where the button contents would be centered instead of
     * left-aligned.
     */
    width: 100%;
  }
`;

export default function HelpDropdown(): ReactElement {
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

  const toggleShortcutKeyModal = useCallback((): void => {
    setShowShortcutKeyModal((prev) => !prev);
  }, []);
  useHotkeys(ShortcutKeys.navigation.showShortcutMenu.keycode, toggleShortcutKeyModal);

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
      <StyledButton type="text" onClick={() => setShowShortcutKeyModal(true)}>
        Keyboard shortcuts
      </StyledButton>
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
        {INTERNAL_BUILD && (
          <p>
            <b>--INTERNAL BUILD--</b>
          </p>
        )}
      </StyledModal>
      <ShortcutKeyModal open={showShortcutKeyModal} setOpen={setShowShortcutKeyModal} />
    </div>
  );
}
