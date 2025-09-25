import { Checkbox } from "antd";
import React, { ReactElement, useCallback, useContext, useMemo } from "react";
import styled from "styled-components";

import { useViewerStateStore } from "../../../state";
import { FlexColumn, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import ToggleCollapse from "../../ToggleCollapse";
import { ChannelSettingControl } from "./ChannelSettingControl";

/** Approximate height of each ChannelSettingControl. */
const CHANNEL_SETTING_CONTROL_HEIGHT_PX = 120;

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

/**
 * Controls for for one or more channel settings, within a collapsible section.
 */
export default function ChannelSettingsControl(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  // Used as a dependency; assumes that channel data range changes per frame
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);
  const getChannelDataRange = useViewerStateStore((state) => state.getChannelDataRange);
  const applyChannelRange = useViewerStateStore((state) => state.applyChannelRangePreset);

  const areAllChannelsVisible = channelSettings.every((setting) => setting.visible);
  const areNoChannelsVisible = channelSettings.every((setting) => !setting.visible);
  const maxChannelControlsHeight = CHANNEL_SETTING_CONTROL_HEIGHT_PX * channelSettings.length + 100;

  const handleShowAllChannelsChange = (checked: boolean): void => {
    channelSettings.forEach((_, index) => {
      updateChannelSettings(index, { visible: checked });
    });
  };

  const syncChannelDataRange = useCallback(
    (channelIndex: number): void => {
      const range = getChannelDataRange(channelIndex);
      if (range) {
        updateChannelSettings(channelIndex, { dataMin: range[0], dataMax: range[1] });
      }
    },
    [getChannelDataRange, updateChannelSettings]
  );

  const channelSettingElements = useMemo(() => {
    if (!dataset || !dataset.frames3d || !dataset.frames3d.backdrops) {
      // Placeholder
      return (
        <div style={{ whiteSpace: "nowrap" }}>
          <p style={{ color: theme.color.text.hint }}>No channels available</p>
        </div>
      );
    }

    return dataset.frames3d.backdrops.map((backdropData, index) => {
      const name = backdropData.name || `Channel ${index + 1}`;
      const settings = channelSettings[index];
      const channelDataRange = getChannelDataRange(index);
      const syncDisabled =
        channelDataRange === null ||
        (channelDataRange[0] === channelSettings[index].dataMin &&
          channelDataRange[1] === channelSettings[index].dataMax);
      return (
        <ChannelSettingControl
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
  }, [
    channelSettings,
    dataset,
    currentFrame,
    getChannelDataRange,
    updateChannelSettings,
    syncChannelDataRange,
    applyChannelRange,
  ]);

  return (
    <ToggleCollapse
      label={"Channels"}
      postToggleContent={
        <FlexRowAlignCenter style={{ marginTop: 2 }}>
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
        </FlexRowAlignCenter>
      }
      maxContentHeightPx={maxChannelControlsHeight}
      contentIndentPx={16}
    >
      <div style={{ marginRight: "20px", paddingTop: "4px" }}>
        <ChannelSettingsContainer>{channelSettingElements}</ChannelSettingsContainer>
      </div>
    </ToggleCollapse>
  );
}
