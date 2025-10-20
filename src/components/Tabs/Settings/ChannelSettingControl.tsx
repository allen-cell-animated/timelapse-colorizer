import { Button, Tooltip } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import { ChannelRangePreset, type ChannelSetting } from "src/colorizer";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { DEFAULT_SETTINGS_LABEL_WIDTH_PX, SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { FlexColumn, FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";
import { antToThreeColor, threeToAntColorWithAlpha } from "src/utils/color_utils";

const INDENT_PX = 12;
const RANGE_LABEL_WIDTH_PX = DEFAULT_SETTINGS_LABEL_WIDTH_PX - INDENT_PX * 2;

type ChannelSettingControlProps = {
  name: string;
  channelIndex: number;
  settings: ChannelSetting;
  updateSettings: (settings: Partial<ChannelSetting>) => void;
  onClickSync: () => void;
  onClickRangePreset: (preset: ChannelRangePreset) => void;
};

const StyledToggleCollapse = styled(ToggleCollapse)`
  // Hide extra padding on empty checkbox label
  & .toggle-collapse-header .ant-checkbox-wrapper span {
    padding: 0;
  }
`;

/** Controls for an individual channel's settings */
export function ChannelSettingControl(props: ChannelSettingControlProps): ReactElement {
  const { name, channelIndex, settings, updateSettings, onClickSync, onClickRangePreset } = props;
  const rangeSliderId = `settings-channel-range-slider-${channelIndex}`;

  const collapseLabel = (
    <WrappedColorPicker
      value={threeToAntColorWithAlpha(settings.color, settings.opacity)}
      onChange={(antdColor) => {
        const { color, alpha: opacity } = antToThreeColor(antdColor);
        updateSettings({ color, opacity });
      }}
    />
  );

  return (
    <StyledToggleCollapse
      label={name}
      toggleChecked={settings.visible}
      toggleType="checkbox"
      checkboxLabel={<VisuallyHidden>Show channel</VisuallyHidden>}
      onToggleChange={(checked) => updateSettings({ visible: checked })}
      postToggleContent={collapseLabel}
      contentIndentPx={INDENT_PX}
      contentPaddingPx={6}
      // Hide collapse button, and allow the section to toggle open/closed based
      // on whether the channel is visible
      showCollapseButton={false}
      // Match visually with other setting labels
      labelStyle={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)" }}
    >
      <SettingsContainer indentPx={INDENT_PX} labelWidth={`${RANGE_LABEL_WIDTH_PX}px`}>
        <SettingsItem label="Range" htmlFor={rangeSliderId} labelStyle={{ height: "fit-content", paddingTop: 3 }}>
          <FlexColumn $gap={6} style={{ alignItems: "flex-start", width: "100%" }}>
            <FlexRowAlignCenter $gap={4}>
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
              <Tooltip title="Fits the range of slider values to the current frame's data range">
                <Button onClick={onClickSync}>Fit to data</Button>
              </Tooltip>
            </FlexRowAlignCenter>
          </FlexColumn>
        </SettingsItem>
      </SettingsContainer>
    </StyledToggleCollapse>
  );
}
