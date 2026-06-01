import { Button, Popover } from "antd";
import React, { PropsWithChildren, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";

import { FlexColumn } from "src/styles/utils";

type ConfigWrapperProps = {
  popoverContent: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showClose?: boolean;
  placement?: "top" | "left" | "right" | "bottom";
};

const defaultProps = {
  showClose: true,
  placement: "bottom",
} as const;

/**
 * Adds a popup config menu that appears when clicking the child element. The
 * popup is inlined in the DOM and can be navigated to via tabbing.
 */
export default function ConfigWrapper(inputProps: PropsWithChildren<ConfigWrapperProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [configMenuOpen, _setConfigMenuOpen] = useState(!!props.open);
  const setConfigMenuOpen = (open: boolean) => {
    _setConfigMenuOpen(open);
    props.onOpenChange?.(open);
  };

  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Close the menu when the user focuses on an outside element.
  useEffect(() => {
    if (!configMenuOpen) {
      return;
    }
    function onBlur(event: FocusEvent): void {
      const relatedTarget = event.relatedTarget as Node | null;
      // Ignore blur events where the focus is moving to a parent containing
      // element; if a parent has `tabindex=0` set (e.g. Ant's tab components),
      // it will steal focus.
      if (relatedTarget === null || (popupContainerRef.current && relatedTarget.contains(popupContainerRef.current))) {
        return;
      }
      if (popupContainerRef.current && !popupContainerRef.current.contains(relatedTarget)) {
        setConfigMenuOpen(false);
      }
    }
    popupContainerRef.current?.addEventListener("focusout", onBlur, true);
    return () => {
      popupContainerRef.current?.removeEventListener("focusout", onBlur, true);
    };
  }, [configMenuOpen]);

  // Wrap and optionally add a close button to the content
  const popoverContent = (
    <FlexColumn ref={popoverContentRef}>
      {props.popoverContent}
      {props.showClose && (
        <div style={{ marginTop: "12px", textAlign: "right" }}>
          <Button size="small" onClick={() => setConfigMenuOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </FlexColumn>
  );

  return (
    <div ref={popupContainerRef}>
      <Popover
        content={popoverContent}
        placement={props.placement}
        trigger={["click"]}
        getPopupContainer={() => popupContainerRef.current || document.body}
        onOpenChange={setConfigMenuOpen}
        open={props.open ?? configMenuOpen}
      >
        {props.children}
      </Popover>
    </div>
  );
}
