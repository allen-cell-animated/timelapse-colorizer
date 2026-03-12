import React, { type ReactElement, type ReactNode } from "react";

import { ImageToggleButton } from "src/components/Buttons/ImageToggleButton";
import ShortcutTooltipHint from "src/components/Display/ShortcutTooltipHint";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

const enum BackdropToggleButtonHtmlIds {
  OPACITY_SLIDER = "backdrop-toggle-opacity-slider",
  BACKDROP_SELECT = "backdrop-toggle-backdrop-select",
}

export default function BackdropToggleButton(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);

  const backdropData = dataset?.getBackdropData();
  const hasBackdrops = backdropData !== undefined && backdropData.size > 0 && backdropKey !== null;
  const selectedBackdrop = hasBackdrops ? backdropData.get(backdropKey) : undefined;

  // Dropdown contents
  const backdropDataArr = Array.from(backdropData?.entries() ?? []);
  const backdropsAsItems: SelectItem[] = backdropDataArr.map(([key, backdrop]) => ({
    value: key,
    label: backdrop.name,
  }));

  // Tooltip
  const backdropTooltipContents: ReactNode[] = [
    <span key="backdrop-name">{selectedBackdrop?.name ?? "(No backdrops available)"}</span>,
  ];

  // Config menu
  const createBackdropConfigMenuContents = [
    <SettingsContainer labelWidth="85px" key="backdrop-settings-container">
      <SettingsItem
        label={
          <FlexRow $gap={6}>
            Backdrop
            <ShortcutTooltipHint
              shortcutKeys={[
                SHORTCUT_KEYS.backdropsOrChannels.cycleForward,
                SHORTCUT_KEYS.backdropsOrChannels.cycleBackward,
                SHORTCUT_KEYS.backdropsOrChannels.showChannel,
              ]}
            ></ShortcutTooltipHint>
          </FlexRow>
        }
        htmlFor={BackdropToggleButtonHtmlIds.BACKDROP_SELECT}
        labelStyle={{ marginBottom: "auto", marginTop: 4 }}
      >
        <FlexColumn $gap={4}>
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
        </FlexColumn>
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
