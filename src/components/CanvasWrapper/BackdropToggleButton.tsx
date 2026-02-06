import React, { type ReactElement, type ReactNode, useContext } from "react";

import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";

const enum BackdropToggleButtonHtmlIds {
  OPACITY_SLIDER = "backdrop-toggle-opacity-slider",
  BACKDROP_SELECT = "backdrop-toggle-backdrop-select",
}

export default function BackdropToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);

  // Tooltip shows current backdrop + link to viewer settings
  const backdropData = dataset?.getBackdropData();
  const hasBackdrops = backdropData !== undefined && backdropData.size > 0;

  const backdropsAsItems: SelectItem[] = Array.from(backdropData?.entries() ?? []).map(([key, backdrop]) => ({
    value: key,
    label: backdrop.name,
  }));

  // Tooltip
  const backdropTooltipContents: ReactNode[] = [
    <span key="backdrop-name" style={{ color: theme.color.text.button }}>
      {hasBackdrops && backdropKey ? backdropData.get(backdropKey)?.name : "(No backdrops available)"}
    </span>,
  ];

  // Config menu
  const createBackdropConfigMenuContents = [
    <SettingsContainer labelWidth="70px" key="backdrop-settings-container">
      <SettingsItem label="Backdrop" htmlFor={BackdropToggleButtonHtmlIds.BACKDROP_SELECT}>
        <SelectionDropdown
          id={BackdropToggleButtonHtmlIds.BACKDROP_SELECT}
          disabled={!hasBackdrops}
          items={backdropsAsItems}
          selected={backdropKey ?? ""}
          onChange={(value) => {
            setBackdropVisible(true);
            setBackdropKey(value);
          }}
          controlWidth="220px"
        />
      </SettingsItem>
      <SettingsItem label="Opacity" htmlFor={BackdropToggleButtonHtmlIds.OPACITY_SLIDER} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", flexGrow: 1 }}>
          <LabeledSlider
            id={BackdropToggleButtonHtmlIds.OPACITY_SLIDER}
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
  ];

  return (
    <ImageToggleButton
      visible={backdropVisible}
      imageType={"backdrop"}
      tooltipContents={backdropTooltipContents}
      configMenuContents={createBackdropConfigMenuContents}
      disabled={dataset === null || backdropKey === null}
      setVisible={setBackdropVisible}
    />
  );
}
