import { Checkbox, ConfigProvider } from "antd";
import React, { ReactElement, ReactNode, useContext, useRef } from "react";

import { TabType } from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { VisuallyHidden } from "../../styles/utils";

import { AppThemeContext } from "../AppStyle";
import { ImageToggleButton } from "../Buttons/ImageToggleButton";
import TooltipButtonStyleLink from "../Buttons/TooltipButtonStyleLink";

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
  const hasChannels = channelData !== undefined && channelData.length > 0;
  const channelVisibility = channelSettings.map((setting) => setting.visible);
  const isAnyChannelVisible = hasChannels && channelSettings.some((setting) => setting.visible);

  // By default, enable first three channels
  const lastVisibleChannelConfig = useRef<boolean[]>([true, true, true]);
  if (isAnyChannelVisible) {
    lastVisibleChannelConfig.current = channelVisibility;
  }

  const tooltipContents: ReactNode[] = [];
  if (!hasChannels) {
    tooltipContents.push(<span key="no-channels">(No channels available)</span>);
  } else {
    const channelToggles = channelData.map((channel, index) => {
      return (
        <Checkbox
          key={`channel-checkbox-${index}`}
          checked={channelVisibility[index]}
          onChange={(e) => {
            updateChannelSettings(index, { visible: e.target.checked });
          }}
        >
          <span style={{ color: theme.color.text.button }}>{channel.name}</span>
        </Checkbox>
      );
    });
    tooltipContents.push(
      <ConfigProvider theme={{ components: { Checkbox: { colorBgContainer: "transparent" } } }}>
        <div style={{ padding: "4px 0 4px 6px" }}>{channelToggles}</div>
      </ConfigProvider>
    );
  }
  tooltipContents.push(
    <TooltipButtonStyleLink onClick={() => setOpenTab(TabType.SETTINGS)} key="channel-settings-link">
      <span>
        {"Viewer settings > Channels"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
      </span>
    </TooltipButtonStyleLink>
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
      label={"channels"}
      tooltipContents={tooltipContents}
    ></ImageToggleButton>
  );
}
