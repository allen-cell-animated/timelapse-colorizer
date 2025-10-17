import { SyncOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";

import { ChannelRangePreset, ChannelSetting } from "src/colorizer";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { FlexColumn, FlexRowAlignCenter } from "src/styles/utils";
import { antToThreeColor, threeToAntColorWithAlpha } from "src/utils/color_utils";

type ChannelSettingControlProps = {
  name: string;
  channelIndex: number;
  settings: ChannelSetting;
  updateSettings: (settings: Partial<ChannelSetting>) => void;
  onClickSync: () => void;
  syncDisabled?: boolean;
  onClickRangePreset: (preset: ChannelRangePreset) => void;
};

export const VerticalDivider = styled.div`
  width: 1px;
  background-color: var(--color-borders);
  margin: 0 12px;
  height: 14px;
`;

/** Controls for an individual channel's settings */
export function ChannelSettingControl(props: ChannelSettingControlProps): ReactElement {
  const { name, channelIndex, settings, updateSettings, onClickSync, onClickRangePreset } = props;
  const rangeSliderId = `settings-channel-range-slider-${channelIndex}`;

  const collapseLabel = (
    <>
      <WrappedColorPicker
        value={threeToAntColorWithAlpha(settings.color, settings.opacity)}
        onChange={(antdColor) => {
          const { color, alpha: opacity } = antToThreeColor(antdColor);
          updateSettings({ color, opacity });
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
              <div style={{ minWidth: "calc(min(450px, 75%))" }}>
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
