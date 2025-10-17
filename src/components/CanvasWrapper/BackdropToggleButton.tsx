import { ConfigProvider, Radio } from "antd";
import React, { type ReactElement, type ReactNode, useContext } from "react";

import { TabType } from "src/colorizer";
import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import TooltipButtonStyleLink from "src/components/Buttons/TooltipButtonStyleLink";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { VisuallyHidden } from "src/styles/utils";

export default function BackdropToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);

  // Tooltip shows current backdrop + link to viewer settings
  const backdropTooltipContents: ReactNode[] = [];
  const backdropData = dataset?.getBackdropData();
  const hasBackdrops = backdropData !== undefined && backdropData.size > 0;

  if (!hasBackdrops) {
    backdropTooltipContents.push(<span key="no-backdrops">(No backdrops available)</span>);
  } else if (backdropData.size === 1) {
    // If only one backdrop is available, just show its name
    backdropTooltipContents.push(
      <span key="backdrop-name" style={{ color: theme.color.text.button }}>
        {backdropKey && backdropData.get(backdropKey)?.name}
      </span>
    );
  } else {
    // Create a radio button for each backdrop
    backdropTooltipContents.push(
      <ConfigProvider theme={{ components: { Radio: { colorBgContainer: "transparent" } } }}>
        <Radio.Group
          aria-label="Backdrop"
          value={backdropKey}
          onChange={(e) => {
            setBackdropVisible(true);
            setBackdropKey(e.target.value);
          }}
          style={{ padding: "4px 0 4px 6px" }}
        >
          {Array.from(backdropData.entries()).map(([key, backdrop]) => (
            <Radio key={key} value={key} style={{ color: theme.color.text.button }}>
              {backdrop.name}
            </Radio>
          ))}
        </Radio.Group>
      </ConfigProvider>
    );
  }
  backdropTooltipContents.push(
    <TooltipButtonStyleLink key="backdrop-settings-link" onClick={() => setOpenTab(TabType.SETTINGS)}>
      <span>
        {"Viewer settings > Backdrop"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
      </span>
    </TooltipButtonStyleLink>
  );

  return (
    <ImageToggleButton
      visible={backdropVisible}
      label={"backdrop"}
      tooltipContents={backdropTooltipContents}
      disabled={dataset === null || backdropKey === null}
      setVisible={setBackdropVisible}
    />
  );
}
