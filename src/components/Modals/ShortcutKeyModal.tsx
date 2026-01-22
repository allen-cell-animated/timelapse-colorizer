import { Button, Card } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import ShortcutKeyDisplay from "src/components/Modals/ShortcutKeyCard";
import StyledModal from "src/components/Modals/StyledModal";
import { getShortcutDisplayText, ShortcutKeycode, ShortcutKeys } from "src/constants";
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
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.viewport} title="Viewport" />
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.annotation} title="Annotation" />
        <ShortcutKeyDisplay shortcutKeys={ShortcutKeys.navigation} title="Navigation" />
        <ShortcutCard size="small" title="Viewport">
          <FlexColumn $gap={10}>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.playback.stepBack)}</HotkeyText>{" "}
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.playback.stepForward)}</HotkeyText> step frame
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.playback.toggle)}</HotkeyText> play / pause
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Left click</HotkeyText> select track
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.viewport.multiTrackSelect)}</HotkeyText>{" "}
              <HotkeyText>Left click</HotkeyText> select multiple tracks
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Ctrl</HotkeyText> <HotkeyText>Scroll wheel</HotkeyText> zoom viewport (also trackpad pinch)
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>Click + drag</HotkeyText> pan viewport
            </FlexRowAlignCenter>
          </FlexColumn>
        </ShortcutCard>
        <ShortcutCard size="small" title="Annotation">
          <FlexColumn $gap={10}>
            {/* TODO: Add a shortcut key for enabling annotations */}
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.annotation.selectRange)}</HotkeyText> hold to select
              range
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
              <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.annotation.reuseValue)}</HotkeyText> hold to reuse
              last integer value
            </FlexRowAlignCenter>
          </FlexColumn>
        </ShortcutCard>
        <ShortcutCard size="small" title="Navigation">
          <FlexRowAlignCenter $gap={6}>
            <HotkeyText>{getShortcutDisplayText(ShortcutKeycode.navigation.showShortcutMenu)}</HotkeyText> show this
            menu
          </FlexRowAlignCenter>
        </ShortcutCard>
      </FlexColumn>
    </StyledModal>
  );
}
