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
  syncDisabled?: boolean;
  onClickRangePreset: (preset: ChannelRangePreset) => void;
};

const VerticalDivider = styled.div`
  width: 1px;
  background-color: var(--color-borders);
  margin: 0 12px;
  height: 14px;
`;

const ChannelSettingsContainer = styled(FlexColumn)`
  display: grid;
  row-gap: 16px;

  // Align color pickers after channel label names
  // label - color picker - vertical separator - channel toggle - collapse button
  grid-template-columns: min-content min-content min-content 1fr min-content;

  & > .toggle-collapse,
  & > .toggle-collapse > .toggle-collapse-content,
  & > .toggle-collapse > .toggle-collapse-control-row,
  & > .toggle-collapse > .toggle-collapse-control-row > .toggle-collapse-header {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    column-gap: 8px;
  }

  & > .toggle-collapse > .toggle-collapse-control-row {
  }

  & > .toggle-collapse > .toggle-collapse-control-row > .toggle-collapse-header {
    // Leave unused column for toggle button to the right
    grid-column: 1 / -2;
  }

  & > .toggle-collapse > .toggle-collapse-content > div {
    // Span columns so the content fills the full width; otherwise
    // it will only fill one column
    grid-column: 1 / -1;
  }
`;

/** Controls for an individual channel's settings */
function ChannelSetting(props: ChannelSettingProps): ReactElement {
  const { name, channelIndex, settings, updateSettings, onClickSync, onClickRangePreset } = props;
  const rangeSliderId = `settings-channel-range-slider-${channelIndex}`;

  const collapseLabel = (
    <>
      <WrappedColorPicker
        value={threeToAntColorWithAlpha(settings.color, settings.opacity)}
        onChange={(color) => {
          const { color: threeColor, alpha } = antToThreeColor(color);
          updateSettings({ color: threeColor, opacity: alpha });
        }}
      />
      <VerticalDivider />
    </>
  );

  return (
    <ToggleCollapse
      label={name}
      toggleChecked={settings.visible}
      toggleType="checkbox"
      checkboxLabel="Show channel"
      onToggleChange={(checked) => updateSettings({ visible: checked })}
      preToggleContent={collapseLabel}
      contentIndentPx={24}
    >
      <SettingsContainer style={{ paddingTop: 4 }} indentPx={30}>
        <SettingsItem label="Range" htmlFor={rangeSliderId} labelStyle={{ height: "fit-content", paddingTop: 3 }}>
          <FlexColumn $gap={6} style={{ alignItems: "flex-start", width: "100%" }}>
            <FlexRowAlignCenter $gap={8}>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.NONE)}>None</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.DEFAULT)}>Default</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.IJ_AUTO)}>IJ Auto</Button>
              <Button onClick={() => onClickRangePreset(ChannelRangePreset.AUTO_2)}>Auto 2</Button>
            </FlexRowAlignCenter>
            <FlexRowAlignCenter $gap={8} style={{ width: "100%" }}>
              <div style={{ minWidth: "calc(min(450px, 100%))" }}>
                <LabeledSlider
                  id={rangeSliderId}
                  type="range"
                  min={settings.min}
                  max={settings.max}
                  minSliderBound={settings.dataMin}
                  maxSliderBound={settings.dataMax}
                  minInputBound={Number.MIN_SAFE_INTEGER}
                  maxInputBound={Number.MAX_SAFE_INTEGER}
                  step={1}
                  onChange={(min, max) => updateSettings({ min, max })}
                />
              </div>
              <Tooltip title="Updates the slider's possible range to match the channel's data range on the current frame. Does not update the range.">
                <Button onClick={onClickSync} disabled={props.syncDisabled}>
                  <SyncOutlined /> Sync
                </Button>
              </Tooltip>
            </FlexRowAlignCenter>
          </FlexColumn>
        </SettingsItem>
      </SettingsContainer>
    </ToggleCollapse>
  );
}

export default function ChannelSettings(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  // Not a direct dependency, but assume that channel data range will change on
  // frame change
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);
  const getChannelDataRange = useViewerStateStore((state) => state.getChannelDataRange);
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
        <div style={{ whiteSpace: "nowrap" }}>
          <p style={{ color: theme.color.text.hint }}>No channels available</p>
        </div>
      );
    }
    const syncChannelDataRange = (channelIndex: number): void => {
      const range = getChannelDataRange(channelIndex);
      if (range) {
        updateChannelSettings(channelIndex, { dataMin: range[0], dataMax: range[1] });
      }
    };
    return dataset.frames3d.backdrops.map((backdropData, index) => {
      const name = backdropData.name || `Channel ${index + 1}`;
      const settings = channelSettings[index];
      const channelDataRange = getChannelDataRange(index);
      const syncDisabled =
        channelDataRange === null ||
        (channelDataRange[0] === channelSettings[index].dataMin &&
          channelDataRange[1] === channelSettings[index].dataMax);
      return (
        <ChannelSetting
          name={name}
          key={index}
          channelIndex={index}
          settings={settings}
          updateSettings={(settings) => updateChannelSettings(index, settings)}
          onClickSync={() => syncChannelDataRange(index)}
          syncDisabled={syncDisabled}
          onClickRangePreset={(preset) => applyChannelRange(index, preset)}
        />
      );
    });
  }, [channelSettings, updateChannelSettings, dataset, currentFrame, getChannelDataRange, applyChannelRange]);

  return (
    <ToggleCollapse
      label={"Channels"}
      postToggleContent={
        <>
          <VerticalDivider />
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
      <div style={{ marginRight: "20px", paddingTop: "4px" }}>
        <ChannelSettingsContainer>{channelSettingElements}</ChannelSettingsContainer>
      </div>
    </ToggleCollapse>
  );
}
