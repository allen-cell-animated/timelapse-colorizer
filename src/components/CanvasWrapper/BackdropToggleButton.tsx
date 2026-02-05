import { Button, ConfigProvider, Radio } from "antd";
import React, { type ReactElement, type ReactNode, useContext } from "react";

import { TabType } from "src/colorizer";
import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import TooltipButtonStyleLink from "src/components/Buttons/TooltipButtonStyleLink";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, VisuallyHidden } from "src/styles/utils";

export default function BackdropToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);

  // Tooltip shows current backdrop + link to viewer settings
  const backdropTooltipContents: ReactNode[] = [];
  const backdropData = dataset?.getBackdropData();
  const hasBackdrops = backdropData !== undefined && backdropData.size > 0;

  // Configure tooltip
  if (!hasBackdrops) {
    backdropTooltipContents.push(<span key="no-backdrops">(No backdrops available)</span>);
  } else {
    // If only one backdrop is available, just show its name
    backdropTooltipContents.push(
      <span key="backdrop-name" style={{ color: theme.color.text.button }}>
        {backdropKey && backdropData.get(backdropKey)?.name}
      </span>
    );
  }

  const createBackdropConfigMenuContents = (setOpen: (open: boolean) => void): ReactNode[] => {
    return [
      <SettingsContainer>
        <SettingsItem label="Backdrop">
          <ConfigProvider theme={{ components: { Radio: { colorBgContainer: "transparent" } } }}>
            <Radio.Group
              aria-label="Backdrop"
              value={backdropKey}
              onChange={(e) => {
                setBackdropVisible(true);
                setBackdropKey(e.target.value);
              }}
              style={{ padding: "4px 0 4px 6px" }}
              size="small"
            >
              <FlexColumn $gap={4}>
                {Array.from(backdropData?.entries() ?? []).map(([key, backdrop]) => (
                  <Radio key={key} value={key}>
                    {backdrop.name}
                  </Radio>
                ))}
              </FlexColumn>
            </Radio.Group>
          </ConfigProvider>
        </SettingsItem>
        <SettingsItem label="Opacity" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexGrow: 1 }}>
            <LabeledSlider
              disabled={!backdropVisible}
              type="value"
              value={objectOpacity}
              onChange={setObjectOpacity}
              step={1}
              minSliderBound={0}
              maxSliderBound={100}
              showInput={false}
              numberFormatter={(value) => value + "%"}
            />
          </div>
        </SettingsItem>
      </SettingsContainer>,
      <TooltipButtonStyleLink key="backdrop-settings-link" onClick={() => setOpenTab(TabType.SETTINGS)}>
        <span>
          {"More settings"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
        </span>
      </TooltipButtonStyleLink>,
      <div style={{ marginLeft: "auto" }}>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </div>,
    ];
  };

  return (
    <ImageToggleButton
      visible={backdropVisible}
      label={"backdrop"}
      tooltipContents={backdropTooltipContents}
      configMenuContents={createBackdropConfigMenuContents}
      disabled={dataset === null || backdropKey === null}
      setVisible={setBackdropVisible}
    />
  );
}
