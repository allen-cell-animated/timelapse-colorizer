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

export type ToggleButtonWithConfigProps = {
  name: string;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  disabled: boolean;
  tooltipContents?: ReactNode;
  configMenuContents: ReactNode | ((setOpen: (open: boolean) => void) => ReactNode[]);
  enabledIcon?: ReactNode;
  disabledIcon?: ReactNode;
  settingsLinkText: string;
};

const defaultProps = {
  enabledIcon: <ImagesIconSVG />,
  disabledIcon: <ImagesSlashIconSVG />,
};

/**
 * Toggleable icon button with a popup config menu. Shows a tooltip on hover or
 * focus.
 */
export function ToggleButtonWithConfig(inputProps: ToggleButtonWithConfigProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
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
  const tooltipTitle = buttonActionVerb + " " + props.name;

  const tooltipContents = Array.isArray(props.tooltipContents) ? [...props.tooltipContents] : [props.tooltipContents];
  if (props.visible && !configMenuOpen) {
    tooltipContents.push("Double-click to hide " + props.name.toLowerCase());
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
            {props.settingsLinkText} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
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
            {props.visible ? props.enabledIcon : props.disabledIcon}
            <VisuallyHidden>{tooltipTitle}</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>
      </Popover>
    </div>
  );
}
