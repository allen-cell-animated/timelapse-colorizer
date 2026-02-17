import { Checkbox } from "antd";
import React, { type ReactElement, type ReactNode, useContext, useRef } from "react";

import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import { KeyCharacter } from "src/components/Display/ShortcutKeyText";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRow } from "src/styles/utils";
import { formatQuantityString } from "src/utils/formatting";

const enum ChannelToggleButtonHtmlIds {
  CHANNEL_CHECKBOXES = "channel-toggle-channel-checkbox",
}

/**
 * Icon button that toggles 3D channels, and includes a tooltip that
 * allows toggling individual channels.
 */
export default function ChannelToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);
  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);

  const channelData = dataset?.frames3d?.backdrops;
  const hasChannels = !!channelData && channelData.length > 0;
  const channelVisibility = channelSettings.map((setting) => setting.visible);
  const isAnyChannelVisible = hasChannels && channelSettings.some((setting) => setting.visible);

  // By default, enable first three channels
  const lastVisibleChannelConfig = useRef<boolean[]>([true, true, true]);
  if (isAnyChannelVisible) {
    lastVisibleChannelConfig.current = channelVisibility;
  }

  const channelString = formatQuantityString(channelData?.length ?? 0, "channel", "channels");
  const tooltipContents: ReactNode[] = [
    <span key="no-channels">{hasChannels ? `${channelString} available` : "(No channels available)"}</span>,
  ];

  const createConfigMenuContents = (
    <SettingsContainer labelWidth="80px" style={{ marginBottom: 6 }} key="channel-settings-container">
      <SettingsItem
        label={"Channels"}
        labelStyle={{ marginBottom: "auto" }}
        htmlFor={ChannelToggleButtonHtmlIds.CHANNEL_CHECKBOXES}
      >
        <div style={{ paddingLeft: "6px" }} id={ChannelToggleButtonHtmlIds.CHANNEL_CHECKBOXES}>
          {(channelData ?? []).map((channel, index) => {
            return (
              <Checkbox
                key={`channel-checkbox-${index}`}
                checked={channelVisibility[index]}
                onChange={(e) => {
                  updateChannelSettings(index, { visible: e.target.checked });
                }}
                style={{ padding: "2px 0" }}
              >
                <span>{channel.name}</span>
              </Checkbox>
            );
          })}
          <FlexRow style={{ color: theme.color.text.hint, width: "100%" }} $gap={4}>
            Press <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.cycleBackward.keycodeDisplay[0]}</KeyCharacter> /{" "}
            <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.cycleForward.keycodeDisplay[0]}</KeyCharacter> or{" "}
            <KeyCharacter>{SHORTCUT_KEYS.backdropsOrChannels.showChannel.keycodeDisplay}</KeyCharacter> to cycle
          </FlexRow>
        </div>
      </SettingsItem>
    </SettingsContainer>
  );

  const onSetVisible = (visible: boolean): void => {
    if (visible) {
      // Restore last visible channel config
      channelSettings.forEach((_, index) => {
        const visible = lastVisibleChannelConfig.current[index] ?? false;
        updateChannelSettings(index, { visible });
      });
    } else {
      // Hide all channels
      channelSettings.forEach((_, index) => {
        updateChannelSettings(index, { visible: false });
      });
    }
  };

  return (
    <ImageToggleButton
      visible={isAnyChannelVisible}
      setVisible={onSetVisible}
      disabled={!hasChannels}
      imageType={"channels"}
      tooltipContents={tooltipContents}
      configMenuContents={createConfigMenuContents}
    ></ImageToggleButton>
  );
}
