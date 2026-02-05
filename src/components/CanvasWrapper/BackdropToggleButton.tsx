import React, { type ReactElement, type ReactNode, useContext } from "react";

import { TabType } from "src/colorizer";
import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import { LinkStyleButton } from "src/components/Buttons/LinkStyleButton";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { VisuallyHidden } from "src/styles/utils";

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
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
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
  const createBackdropConfigMenuContents = (setOpen: (open: boolean) => void): ReactNode[] => {
    return [
      <SettingsContainer labelWidth="70px">
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
      <div>
        <LinkStyleButton
          key="backdrop-settings-link"
          onClick={() => {
            setOpenTab(TabType.SETTINGS);
            setOpen(false);
          }}
          $color={theme.color.text.hint}
          $hoverColor={theme.color.text.secondary}
        >
          <span>
            {"Viewer settings > 2D Backdrop"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
          </span>
        </LinkStyleButton>
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
