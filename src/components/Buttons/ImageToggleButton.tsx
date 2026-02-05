import { CloseOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import React, { type ReactElement, type ReactNode, useRef, useState } from "react";

import { ImagesIconSVG, ImagesSlashIconSVG } from "src/assets";
import TextButton from "src/components/Buttons/TextButton";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
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

/**
 * Icon button that toggles an image layer (e.g. 3D channels or 2D backdrop
 * images), as a reusable component.
 */
export function ImageToggleButton(props: ToggleImageButtonProps): ReactElement {
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [configMenuOpen, setConfigMenuOpen] = useState(false);

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

  const configTitle = (
    <FlexRow style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ fontSize: "16px", marginTop: 0 }}>{"Configure " + props.label}</p>
      <TextButton>
        <CloseOutlined />
      </TextButton>
    </FlexRow>
  );

  return (
    <div ref={popupContainerRef}>
      <Popover
        content={
          <FlexColumn>
            {typeof props.configMenuContents === "function"
              ? props.configMenuContents(setConfigMenuOpen)
              : props.configMenuContents}
            <div style={{ marginLeft: "auto", marginTop: "8px" }}>
              <Button onClick={() => setConfigMenuOpen(false)}>Close</Button>
            </div>
          </FlexColumn>
        }
        placement="right"
        title={configTitle}
        trigger={["click"]}
        getPopupContainer={() => popupContainerRef.current || document.body}
        onOpenChange={(open) => setConfigMenuOpen(open)}
        open={configMenuOpen}
      >
        <TooltipWithSubtitle
          title={tooltipTitle}
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
