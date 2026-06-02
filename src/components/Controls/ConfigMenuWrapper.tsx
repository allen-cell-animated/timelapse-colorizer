import { Button, Popover } from "antd";
import React, { type PropsWithChildren, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";

import { FlexColumn } from "src/styles/utils";

type ConfigMenuWrapperProps = {
  popoverContent: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Whether to show a close button in the popup. */
  showClose?: boolean;
  placement?: "top" | "left" | "right" | "bottom";
};

const defaultProps = {
  showClose: true,
  placement: "bottom",
} as const;

/**
 * Adds a popup config menu that appears when clicking the child element (e.g. a
 * button). The popup is inlined in the DOM and can be navigated to via tabbing.
 */
export default function ConfigMenuWrapper(inputProps: PropsWithChildren<ConfigMenuWrapperProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [configMenuOpen, _setConfigMenuOpen] = useState(!!props.open);
  const setConfigMenuOpen = (open: boolean): void => {
    _setConfigMenuOpen(open);
    props.onOpenChange?.(open);
  };

  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  const isOpen = props.open ?? configMenuOpen;

  // Close the menu when the user focuses on an outside element.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onBlur(event: FocusEvent): void {
      const relatedTarget = event.relatedTarget as Node | null;
      const container = popupContainerRef.current;
      if (!relatedTarget || !container) {
        return;
      }
      // Ignore blur events where the focus is moving to a child or parent
      // element. Parents that have `tabindex=0` set (e.g. Ant's tab components)
      // will otherwise steal focus on click and cause the menu to close
      // unexpectedly.
      const isPopupParent = container.contains(relatedTarget);
      const isTargetParent = relatedTarget.contains(container);
      if (isPopupParent || isTargetParent) {
        return;
      }
      setConfigMenuOpen(false);
    }
    popupContainerRef.current?.addEventListener("focusout", onBlur, true);
    return () => {
      popupContainerRef.current?.removeEventListener("focusout", onBlur, true);
    };
  }, [isOpen]);

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
        open={isOpen}
      >
        {props.children}
      </Popover>
    </div>
  );
}
