import { Checkbox } from "antd";
import React, { type ReactElement, type ReactNode, useContext, useRef } from "react";

import { TabType } from "src/colorizer";
import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import { LinkStyleButton } from "src/components/Buttons/LinkStyleButton";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { VisuallyHidden } from "src/styles/utils";

/**
 * Icon button that toggles 3D channels, and includes a tooltip that
 * allows toggling individual channels.
 */
export default function ChannelToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);

  const channelData = dataset?.frames3d?.backdrops;
  const hasChannels = !!channelData && channelData.length > 0;
  const channelVisibility = channelSettings.map((setting) => setting.visible);
  const isAnyChannelVisible = hasChannels && channelSettings.some((setting) => setting.visible);

  // By default, enable first three channels
  const lastVisibleChannelConfig = useRef<boolean[]>([true, true, true]);
  if (isAnyChannelVisible) {
    lastVisibleChannelConfig.current = channelVisibility;
  }

  const tooltipContents: ReactNode[] = [
    <span key="no-channels">
      {hasChannels ? `${channelData.length} channels available` : "(No channels available)"}
    </span>,
  ];

  const createConfigMenuContents = (setOpen: (open: boolean) => void): ReactNode[] => [
    <SettingsContainer labelWidth="60px" style={{ marginBottom: 6 }}>
      <SettingsItem label={"Channels"} labelStyle={{ marginBottom: "auto" }}>
        <div style={{ padding: "0 0 0 6px" }}>
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
        </div>
      </SettingsItem>
    </SettingsContainer>,
    <div>
      <LinkStyleButton
        key="backdrop-settings-link"
        onClick={() => {
          setOpenTab(TabType.SETTINGS);
          setOpen(false);
        }}
        $color={theme.color.text.hint}
        $hoverColor={theme.color.text.secondary}
      >
        <span>
          {"Viewer settings > 3D Channels"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
        </span>
      </LinkStyleButton>
    </div>,
  ];

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
      label={"channels"}
      tooltipContents={tooltipContents}
      configMenuContents={createConfigMenuContents}
    ></ImageToggleButton>
  );
}
