import { SyncOutlined } from "@ant-design/icons";
import { Button, Checkbox, Tooltip } from "antd";
import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";

import { ChannelRangePreset } from "../../../colorizer";
import { useViewerStateStore } from "../../../state";
import { ViewerStoreState } from "../../../state/slices";
import { FlexColumn, FlexRowAlignCenter } from "../../../styles/utils";
import { antToThreeColor, threeToAntColorWithAlpha } from "../../../utils/color_utils";

import { AppThemeContext } from "../../AppStyle";
import CustomCollapse from "../../CustomCollapse";
import LabeledSlider from "../../Inputs/LabeledSlider";
import WrappedColorPicker from "../../Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "../../SettingsContainer";
import ToggleCollapse from "../../ToggleCollapse";

type ChannelSettingProps = {
  name: string;
  channelIndex: number;
  settings: ViewerStoreState["channelSettings"][number];
  updateSettings: (settings: Partial<ViewerStoreState["channelSettings"][number]>) => void;
  onClickSync: () => void;
  onClickRangePreset: (preset: ChannelRangePreset) => void;
};

const ChannelSettingsContainer = styled(FlexColumn)`
  display: grid;
  row-gap: 16px;
  // expand/collapse icon
  grid-template-columns: 20px min-content min-content auto;
`;

const ChannelCollapse = styled(CustomCollapse)`
  &,
  & > .ant-collapse-item,
  & > .ant-collapse-item > .ant-collapse-header {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / 5;

    & > .ant-collapse-header-text {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: 3 / 5;

      & > h3 {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: 1 / 3;
      }
    }
  }
`;

const ChannelSettingLabelContainer = styled.div`
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / 3;
  align-items: center;
`;

/** Controls for an individual channel's settings */
function ChannelSetting(props: ChannelSettingProps): ReactElement {
  const { name, channelIndex, settings, updateSettings, onClickSync, onClickRangePreset } = props;
  const rangeSliderId = `settings-channel-range-slider-${channelIndex}`;

  const collapseLabel = (
    <ChannelSettingLabelContainer>
      <span style={{ marginRight: "16px" }}>{name}</span>
      <FlexRowAlignCenter $gap={8}>
        <WrappedColorPicker
          value={threeToAntColorWithAlpha(settings.color, settings.opacity)}
          onChange={(color) => {
            const { color: threeColor, alpha } = antToThreeColor(color);
            updateSettings({ color: threeColor, opacity: alpha });
          }}
        />
        |
        <Checkbox
          type="checkbox"
          checked={settings.visible}
          onChange={(e) => updateSettings({ visible: e.target.checked })}
        >
          Show channel
        </Checkbox>
      </FlexRowAlignCenter>
    </ChannelSettingLabelContainer>
  );

  return (
    <ChannelCollapse label={collapseLabel}>
      <div>
        <SettingsContainer>
          <SettingsItem label="Range" htmlFor={rangeSliderId} labelStyle={{ height: "fit-content", paddingTop: 3 }}>
            <FlexRowAlignCenter $gap={8}>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.NONE)}>None</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.DEFAULT)}>Default</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.IJ_AUTO)}>IJ Auto</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.AUTO_2)}>Auto 2</Button>
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={6}>
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
              <Tooltip title="Updates the slider's possible range to match the channel's data range on the current frame. Does not update the range.">
                <Button onClick={onClickSync}>
                  <SyncOutlined /> Sync
                </Button>
              </Tooltip>
            </FlexRowAlignCenter>
          </SettingsItem>
        </SettingsContainer>
      </div>
    </ChannelCollapse>
  );
}

export default function ChannelSettings(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);
  const syncChannelDataRange = useViewerStateStore((state) => state.syncChannelDataRange);
  const applyChannelRange = useViewerStateStore((state) => state.applyChannelRangePreset);

  const areAllChannelsVisible = channelSettings.every((setting) => setting.visible);
  const areNoChannelsVisible = channelSettings.every((setting) => !setting.visible);

  const handleShowAllChannelsChange = (checked: boolean): void => {
    channelSettings.forEach((_, index) => {
      updateChannelSettings(index, { visible: checked });
    });
  };

  const channelSettingElements = useMemo(() => {
    if (!dataset || !dataset.frames3d || !dataset.frames3d.backdrops) {
      return (
        <div>
          <p style={{ color: theme.color.text.hint }}>No channels available</p>
        </div>
      );
    }
    return dataset.frames3d.backdrops.map((backdropData, index) => {
      const name = backdropData.name || `Channel ${index + 1}`;
      const settings = channelSettings[index];
      return (
        <ChannelSetting
          name={name}
          key={index}
          channelIndex={index}
          settings={settings}
          updateSettings={(settings) => updateChannelSettings(index, settings)}
          onClickSync={() => syncChannelDataRange(index)}
          onClickRangePreset={(preset) => applyChannelRange(index, preset)}
        />
      );
    });
  }, [channelSettings, updateChannelSettings, dataset, syncChannelDataRange, applyChannelRange]);

  return (
    <ToggleCollapse
      label={"Channels"}
      headerContent={
        <>
          |
          <Checkbox
            checked={areAllChannelsVisible}
            indeterminate={!areNoChannelsVisible && !areAllChannelsVisible}
            onChange={(e) => {
              handleShowAllChannelsChange(e.target.checked);
            }}
            disabled={channelSettings.length === 0}
          >
            Show all channels
          </Checkbox>
        </>
      }
    >
      <ChannelSettingsContainer>{channelSettingElements}</ChannelSettingsContainer>
    </ToggleCollapse>
  );
}
