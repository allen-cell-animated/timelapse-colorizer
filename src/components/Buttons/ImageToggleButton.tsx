import { CloseOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import React, { type ReactElement, type ReactNode, useContext, useRef, useState } from "react";

import { ImagesIconSVG, ImagesSlashIconSVG } from "src/assets";
import { TabType } from "src/colorizer";
import { LinkStyleButton } from "src/components/Buttons/LinkStyleButton";
import TextButton from "src/components/Buttons/TextButton";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexRow, VisuallyHidden } from "src/styles/utils";

import IconButton from "./IconButton";

export type ToggleImageButtonProps = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  disabled: boolean;
  label: "backdrop" | "channels";
  tooltipContents: ReactNode[];
  configMenuContents: ReactNode[] | ((setOpen: (open: boolean) => void) => ReactNode[]);
};

const labelToViewerSettingsSection = {
  backdrop: "Viewer settings > 2D Backdrop",
  channels: "Viewer settings > 3D Channels",
} as const;

/**
 * Icon button that toggles an image layer (e.g. 3D channels or 2D backdrop
 * images), as a reusable component.
 */
export function ImageToggleButton(props: ToggleImageButtonProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);

  const [configMenuOpen, setConfigMenuOpen] = useState(false);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // When the backdrop or channels are not visible, clicking the button shows
  // them. When they are currently visible, clicking the button opens the config
  // menu. Clicking again while the config menu is open hides the
  // backdrop/channels and closes the config menu.
  const tooltipTitle = (props.visible ? (configMenuOpen ? "Hide" : "Configure ") : "Show") + " " + props.label;

  const tooltipContents = [...props.tooltipContents];
  if (!configMenuOpen && props.visible) {
    tooltipContents.push("Double-click to hide " + props.label.toLowerCase());
  }

  const onClick = (): void => {
    if (props.visible) {
      if (!configMenuOpen) {
        setConfigMenuOpen(true);
      } else {
        setConfigMenuOpen(false);
        props.setVisible(false);
      }
    } else {
      props.setVisible(true);
    }
  };

  const configMenuTitle = (
    <FlexRow style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ fontSize: "16px", marginTop: 0 }}>{"Configure " + props.label}</p>
      <TextButton>
        <CloseOutlined />
      </TextButton>
    </FlexRow>
  );

  // Passed contents + link to settings in the config menu + close button
  const configMenuContents = (
    <FlexColumn>
      {typeof props.configMenuContents === "function"
        ? props.configMenuContents(setConfigMenuOpen)
        : props.configMenuContents}

      <div key="backdrop-settings-link">
        <LinkStyleButton
          onClick={() => {
            setOpenTab(TabType.SETTINGS);
            setConfigMenuOpen(false);
          }}
          $color={theme.color.text.hint}
          $hoverColor={theme.color.text.secondary}
        >
          <span>
            {labelToViewerSettingsSection[props.label]} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
          </span>
        </LinkStyleButton>
      </div>

      <div style={{ marginLeft: "auto", marginTop: "8px" }}>
        <Button onClick={() => setConfigMenuOpen(false)}>Close</Button>
      </div>
    </FlexColumn>
  );

  return (
    <div ref={popupContainerRef}>
      <Popover
        content={configMenuContents}
        placement="right"
        title={configMenuTitle}
        trigger={["click"]}
        getPopupContainer={() => popupContainerRef.current || document.body}
        onOpenChange={(open) => setConfigMenuOpen(open)}
        open={configMenuOpen}
      >
        <TooltipWithSubtitle
          title={tooltipTitle}
          // Normally placed to right for consistency, but preferentially
          // switches to the left when the config menu is open. (If there isn't
          // enough space, both will switch to the left, with the config menu
          // taking priority over the tooltip.)
          placement={configMenuOpen ? "left" : "right"}
          subtitleList={tooltipContents}
          tooltipRef={tooltipRef}
          getPopupContainer={() => popupContainerRef.current || document.body}
        >
          <IconButton
            type={props.visible && !props.disabled ? "primary" : "link"}
            onClick={onClick}
            disabled={props.disabled}
          >
            {props.visible ? <ImagesIconSVG /> : <ImagesSlashIconSVG />}
            <VisuallyHidden>{tooltipTitle}</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>
      </Popover>
    </div>
  );
}
