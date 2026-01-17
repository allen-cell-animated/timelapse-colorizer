import { Button, Card } from "antd";
import React, { ReactElement } from "react";

import StyledModal from "src/components/Modals/StyledModal";
import { HotkeyText } from "src/styles/components";
import { FlexColumn, FlexRowAlignCenter } from "src/styles/utils";

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
        <Card size="small" title="Viewport">
          <FlexColumn $gap={10}>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>←</HotkeyText> /<HotkeyText>→</HotkeyText> step frame
            </FlexRowAlignCenter>
            {/* <FlexRowAlignCenter $gap={6}>
                <HotkeyText>Space</HotkeyText> play / pause
              </FlexRowAlignCenter> */}
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Left click</HotkeyText> select track
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Ctrl</HotkeyText> + <HotkeyText>Left click</HotkeyText> select multiple tracks
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Ctrl</HotkeyText> + <HotkeyText>Scroll wheel</HotkeyText> zoom viewport (also trackpad pinch)
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Click + drag</HotkeyText> pan viewport
            </FlexRowAlignCenter>
          </FlexColumn>
        </Card>
        <Card size="small" title="Annotation">
          <FlexColumn $gap={10}>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Shift</HotkeyText> hold to select range
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Alt</HotkeyText> hold to reuse last integer value
            </FlexRowAlignCenter>
          </FlexColumn>
        </Card>
      </FlexColumn>
    </StyledModal>
  );
}
