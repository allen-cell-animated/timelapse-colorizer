import { Button, Popover } from "antd";
import React, { type ReactElement, type ReactNode, useContext, useRef, useState } from "react";

import { ImagesIconSVG, ImagesSlashIconSVG } from "src/assets";
import { TabType } from "src/colorizer";
import { LinkStyleButton } from "src/components/Buttons/LinkStyleButton";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, VisuallyHidden } from "src/styles/utils";

import IconButton from "./IconButton";

export type ToggleImageButtonProps = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  disabled: boolean;
  imageType: "backdrop" | "channels";
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

  let buttonActionVerb: string;
  if (props.visible) {
    // While visible, clicking the first time opens the config menu, and
    // clicking again hides the image layer.
    if (!configMenuOpen) {
      buttonActionVerb = "Configure";
    } else {
      buttonActionVerb = "Hide";
    }
  } else {
    buttonActionVerb = "Show";
  }
  const tooltipTitle = buttonActionVerb + " " + props.imageType;

  const tooltipContents = [...props.tooltipContents];
  if (props.visible && !configMenuOpen) {
    tooltipContents.push("Double-click to hide " + props.imageType.toLowerCase());
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
            {labelToViewerSettingsSection[props.imageType]} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
          </span>
        </LinkStyleButton>
      </div>

      <div style={{ marginLeft: "auto", marginTop: "8px" }}>
        <Button onClick={() => setConfigMenuOpen(false)}>Close</Button>
      </div>
    </FlexColumn>
  );

  const isVisible = props.visible && !props.disabled;

  return (
    <div ref={popupContainerRef}>
      <Popover
        content={configMenuContents}
        placement="left"
        trigger={["click"]}
        getPopupContainer={() => popupContainerRef.current || document.body}
        onOpenChange={(open) => setConfigMenuOpen(open)}
        open={configMenuOpen}
      >
        <TooltipWithSubtitle
          title={tooltipTitle}
          placement={"right"}
          subtitleList={tooltipContents}
          tooltipRef={tooltipRef}
          getPopupContainer={() => popupContainerRef.current || document.body}
        >
          <IconButton type={isVisible ? "primary" : "link"} onClick={onClick} disabled={props.disabled}>
            {props.visible ? <ImagesIconSVG /> : <ImagesSlashIconSVG />}
            <VisuallyHidden>{tooltipTitle}</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>
      </Popover>
    </div>
  );
}
