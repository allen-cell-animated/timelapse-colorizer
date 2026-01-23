import { Button } from "antd";
import React, { type ReactElement } from "react";

import ShortcutKeyDisplay from "src/components/Display/ShortcutKeyCard";
import StyledModal from "src/components/Modals/StyledModal";
import { ShortcutKeys } from "src/constants";
import { FlexColumn } from "src/styles/utils";

type ShortcutKeyModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function ShortcutKeyModal(props: ShortcutKeyModalProps): ReactElement {
  return (
    <StyledModal
      open={props.open}
      title="Keyboard shortcuts"
      centered
      onCancel={() => props.setOpen(false)}
      footer={<Button onClick={() => props.setOpen(false)}>Close</Button>}
    >
      <FlexColumn $gap={10}>
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.viewport} title="Viewport" />
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.annotation} title="Annotation" />
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.navigation} title="Navigation" />
      </FlexColumn>
    </StyledModal>
  );
}
