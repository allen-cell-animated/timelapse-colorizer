import { Button, Popover } from "antd";
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from "react";

type ButtonWithPopoverProps = {
  label: ReactNode;
  buttonProps?: React.ComponentProps<typeof Button>;
  popoverContent: ReactNode;
};

export default function ButtonWithPopover(props: ButtonWithPopoverProps): ReactElement {
  const [configMenuOpen, setConfigMenuOpen] = useState(false);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Close the menu when no longer focused
  useEffect(() => {
    function onBlur(event: FocusEvent): void {
      const relatedTarget = event.relatedTarget as Node | null;
      if (popoverContentRef.current && !popoverContentRef.current.contains(relatedTarget)) {
        setConfigMenuOpen(false);
      }
    }
    popoverContentRef.current?.addEventListener("focusout", onBlur, true);
    return () => {
      popoverContentRef.current?.removeEventListener("focusout", onBlur, true);
    };
  }, [popoverContentRef.current]);

  return (
    <div ref={popupContainerRef}>
      <Popover
        content={<div ref={popoverContentRef}>{props.popoverContent}</div>}
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
