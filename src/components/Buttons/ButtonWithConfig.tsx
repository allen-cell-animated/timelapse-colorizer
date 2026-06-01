import { Button, Popover } from "antd";
import React, { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";

import { FlexColumn } from "src/styles/utils";

type ButtonWithPopoverProps = {
  label: ReactNode;
  buttonProps?: React.ComponentProps<typeof Button>;
  popoverContent: ReactNode;
  showClose?: boolean;
};

const defaultProps = {
  showClose: true,
};

export default function ButtonWithPopover(inputProps: ButtonWithPopoverProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };

  const [configMenuOpen, setConfigMenuOpen] = useState(false);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Close the menu when the user focuses on an outside element.
  useEffect(() => {
    if (!configMenuOpen) {
      return;
    }
    function onBlur(event: FocusEvent): void {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget !== null && popupContainerRef.current && !popupContainerRef.current.contains(relatedTarget)) {
        setConfigMenuOpen(false);
      }
    }
    popupContainerRef.current?.addEventListener("focusout", onBlur, true);
    return () => {
      popupContainerRef.current?.removeEventListener("focusout", onBlur, true);
    };
  }, [configMenuOpen]);

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
        placement={"bottom"}
        trigger={["click"]}
        getPopupContainer={() => popupContainerRef.current || document.body}
        onOpenChange={(open) => setConfigMenuOpen(open)}
        open={configMenuOpen}
      >
        <Button {...props.buttonProps}>{props.label}</Button>
      </Popover>
    </div>
  );
}
