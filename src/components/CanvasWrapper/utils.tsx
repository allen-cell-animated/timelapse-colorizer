import React, { type ReactNode } from "react";

import { KeyCharacter } from "src/components/Display/ShortcutKeyText";
import { SHORTCUT_KEYS } from "src/constants";
import type { AppTheme } from "src/styles/AppStyle";
import { FlexRow } from "src/styles/utils";

export const getBackdropChannelHotkeyHint = (theme: AppTheme): ReactNode => {
  return (
    <FlexRow style={{ color: theme.color.text.hint, width: "100%" }} $gap={4}>
      Press <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.cycleBackward.keycodeDisplay[0]}</KeyCharacter> /{" "}
      <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.cycleForward.keycodeDisplay[0]}</KeyCharacter> or{" "}
      <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.showChannel.keycodeDisplay}</KeyCharacter> to cycle
    </FlexRow>
  );
};
