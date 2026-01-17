import { Button, Card } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";

import StyledModal from "src/components/Modals/StyledModal";
import { HotkeyText } from "src/styles/components";
import { FlexColumn, FlexRowAlignCenter } from "src/styles/utils";

type ShortcutKeyModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ShortcutCard = styled(Card)`
  & .ant-card-head {
    background-color: var(--color-background-alt);
  }
`;

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
        <ShortcutCard size="small" title="Viewport">
          <FlexColumn $gap={10}>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>←</HotkeyText> <HotkeyText>→</HotkeyText> step frame
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Space</HotkeyText> play / pause
            </FlexRowAlignCenter>
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
        </ShortcutCard>
        <ShortcutCard size="small" title="Annotation">
          <FlexColumn $gap={10}>
            <FlexRowAlignCenter $gap={6}>
              {/* TODO: Add a shortcut key for enabling annotations? */}
              <HotkeyText>Shift</HotkeyText> hold to select range
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Alt</HotkeyText> hold to reuse last integer value
            </FlexRowAlignCenter>
          </FlexColumn>
        </ShortcutCard>
        <ShortcutCard size="small" title="Navigation">
          <FlexRowAlignCenter $gap={6}>
            <HotkeyText>?</HotkeyText> show this menu
          </FlexRowAlignCenter>
        </ShortcutCard>
      </FlexColumn>
    </StyledModal>
  );
}
