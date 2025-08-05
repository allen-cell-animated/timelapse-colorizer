import { SyncOutlined } from "@ant-design/icons";
import { Button, Checkbox } from "antd";
import React, { ReactElement, useMemo } from "react";

import { useViewerStateStore } from "../../../state";
import { ViewerStoreState } from "../../../state/slices";
import { FlexColumn, FlexRowAlignCenter } from "../../../styles/utils";
import { antToThreeColor, threeToAntColorWithAlpha } from "../../../utils/color_utils";

import CustomCollapse from "../../CustomCollapse";
import LabeledSlider from "../../Inputs/LabeledSlider";
import WrappedColorPicker from "../../Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";

type ChannelSettingProps = {
  name: string;
  channelIndex: number;
  settings: ViewerStoreState["channelSettings"][number];
  updateSettings: (settings: Partial<ViewerStoreState["channelSettings"][number]>) => void;
  onClickSync: () => void;
};

function ChannelSetting(props: ChannelSettingProps): ReactElement {
  const { name, channelIndex, settings, updateSettings, onClickSync } = props;
  const rangeSliderId = `settings-channel-range-slider-${channelIndex}`;

  const collapseLabel = (
    <FlexRowAlignCenter $gap={8}>
      <span>{name}</span>
      <WrappedColorPicker
        value={threeToAntColorWithAlpha(settings.color, settings.opacity)}
        onChange={(color) => {
          const { color: threeColor, alpha } = antToThreeColor(color);
          updateSettings({ color: threeColor, opacity: alpha });
        }}
      />
      <Checkbox
        type="checkbox"
        checked={settings.visible}
        onChange={(e) => updateSettings({ visible: e.target.checked })}
      >
        Show channel
      </Checkbox>
    </FlexRowAlignCenter>
  );

  return (
    <CustomCollapse label={collapseLabel}>
      <SettingsContainer>
        <SettingsItem label="Range" htmlFor={rangeSliderId} labelStyle={{ height: "fit-content", paddingTop: 3 }}>
          <FlexRowAlignCenter $gap={8}>
            <Button>None</Button>
            <Button>Default</Button>
            <Button>IJ Auto</Button>
            <Button>Auto 2</Button>
          </FlexRowAlignCenter>
          <FlexRowAlignCenter>
            <LabeledSlider
              id={rangeSliderId}
              type="range"
              min={settings.min}
              max={settings.max}
              minSliderBound={settings.dataMin}
              maxSliderBound={settings.dataMax}
              minInputBound={Number.MIN_SAFE_INTEGER}
              maxInputBound={Number.MAX_SAFE_INTEGER}
              onChange={(min, max) => updateSettings({ min, max })}
            />
            <Button onClick={onClickSync}>
              <SyncOutlined /> Sync
            </Button>
          </FlexRowAlignCenter>
        </SettingsItem>
      </SettingsContainer>
    </CustomCollapse>
  );
}

export default function ChannelSettings(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);

  const areAllChannelsVisible = channelSettings.every((setting) => setting.visible);
  const areNoChannelsVisible = channelSettings.every((setting) => !setting.visible);

  const handleShowAllChannelsChange = (checked: boolean) => {
    channelSettings.forEach((_, index) => {
      updateChannelSettings(index, { visible: checked });
    });
  };

  const channelSettingElements = useMemo(() => {
    if (!dataset || !dataset.frames3d || !dataset.frames3d.backdrops) {
      return <div>No channels available</div>;
    }
    return dataset.frames3d.backdrops.map((backdropData, index) => {
      const name = backdropData.name || `Channel ${index + 1}`;
      const settings = channelSettings[index];
      return (
        <ChannelSetting
          name={name}
          channelIndex={index}
          settings={settings}
          updateSettings={(settings) => updateChannelSettings(index, settings)}
          onClickSync={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      );
    });
  }, [channelSettings, updateChannelSettings, dataset]);

  return (
    <CustomCollapse label={"Channels"}>
      <Checkbox
        checked={areAllChannelsVisible}
        indeterminate={!areNoChannelsVisible && !areAllChannelsVisible}
        onChange={(e) => {
          handleShowAllChannelsChange(e.target.checked);
        }}
      >
        Show all channels
      </Checkbox>
      <FlexColumn $gap={16}>{channelSettingElements}</FlexColumn>
    </CustomCollapse>
  );
}
