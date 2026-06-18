import React, { type ReactElement, type ReactNode } from "react";

import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import ShortcutTooltipHint from "src/components/Display/ShortcutTooltipHint";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

const enum BackdropToggleButtonHtmlIds {
  BACKDROP_SELECT = "backdrop-toggle-backdrop-select",
}

export default function BackdropToggleButton(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);

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
    <SettingsContainer labelWidth="85px" key="backdrop-settings-container" style={{ marginBottom: "8px" }}>
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
            controlWidth="180px"
          />
        </FlexColumn>
      </SettingsItem>
    </SettingsContainer>,
  ];

  return (
    <ToggleButtonWithConfig
      visible={backdropVisible}
      name="backdrop"
      tooltipContents={backdropTooltipContents}
      configMenuContents={createBackdropConfigMenuContents}
      disabled={dataset === null || backdropKey === null}
      setVisible={setBackdropVisible}
      settingsLinkText="Viewer settings > 2D Backdrop"
    />
  );
}
