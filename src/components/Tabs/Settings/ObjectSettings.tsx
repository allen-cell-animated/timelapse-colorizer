import type { PresetsItem } from "antd/es/color-picker/interface";
import React, { type ReactElement } from "react";
import type { Color } from "three";

import { DrawMode, KNOWN_CATEGORICAL_PALETTES, SelectionOutlineColorMode } from "src/colorizer";
import DropdownWithColorPicker from "src/components/Dropdowns/DropdownWithColorPicker";
import type { SelectItem } from "src/components/Dropdowns/types";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { useViewerStateStore } from "src/state";

import { DEFAULT_OUTLINE_COLOR_PRESETS, SETTINGS_GAP_PX } from "./constants";

const enum ObjectSettingsHtmlIds {
  OUTLINE_COLOR_SELECT = "outline-color-select",
  EDGE_COLOR_SELECT = "edge-color-select",
  OUTLIER_OBJECT_COLOR_SELECT = "outlier-object-color-select",
  OUT_OF_RANGE_OBJECT_COLOR_SELECT = "out-of-range-object-color-select",
}

const DRAW_MODE_ITEMS = [
  { value: DrawMode.HIDE.toString(), label: "Hide" },
  { value: DrawMode.USE_COLOR.toString(), label: "Use color" },
] as const satisfies SelectItem[];

const DRAW_MODE_COLOR_PRESETS: PresetsItem[] = [
  {
    label: "Presets",
    colors: [
      "#ffffff",
      "#f0f0f0",
      "#dddddd",
      "#c0c0c0",
      "#9d9d9d",
      "#808080",
      "#525252",
      "#393939",
      "#191919",
      "#000000",
    ],
  },
];

const EDGE_COLOR_PRESETS: PresetsItem[] = [
  {
    label: "Presets",
    colors: ["#ffffff", "#ffffffc0", "#ffffff80", "#ffffff40", "#00000040", "#00000080", "#000000c0", "#000000"],
  },
];

const OUTLINE_COLOR_MODE_ITEMS = [
  { value: SelectionOutlineColorMode.USE_AUTO_COLOR.toString(), label: "Auto" },
  { value: SelectionOutlineColorMode.USE_CUSTOM_COLOR.toString(), label: "Use color" },
  { value: SelectionOutlineColorMode.USE_PALETTE.toString(), label: "Use palette" },
] as const satisfies SelectItem[];

export default function ObjectSettings(): ReactElement {
  const edgeColor = useViewerStateStore((state) => state.edgeColor);
  const edgeColorAlpha = useViewerStateStore((state) => state.edgeColorAlpha);
  const edgeMode = useViewerStateStore((state) => state.edgeMode);
  const outlierDrawSettings = useViewerStateStore((state) => state.outlierDrawSettings);
  const outlineColor = useViewerStateStore((state) => state.outlineColor);
  const outlineColorMode = useViewerStateStore((state) => state.outlineColorMode);
  const outOfRangeDrawSettings = useViewerStateStore((state) => state.outOfRangeDrawSettings);
  const outlinePaletteKey = useViewerStateStore((state) => state.outlinePaletteKey);
  const setEdgeColor = useViewerStateStore((state) => state.setEdgeColor);
  const setEdgeMode = useViewerStateStore((state) => state.setEdgeMode);
  const setOutlierDrawSettings = useViewerStateStore((state) => state.setOutlierDrawSettings);
  const setOutlineColor = useViewerStateStore((state) => state.setOutlineColor);
  const setOutlineColorMode = useViewerStateStore((state) => state.setOutlineColorMode);
  const setOutOfRangeDrawSettings = useViewerStateStore((state) => state.setOutOfRangeDrawSettings);
  const setOutlinePaletteKey = useViewerStateStore((state) => state.setOutlinePaletteKey);

  return (
    <ToggleCollapse label="Objects">
      <SettingsContainer gapPx={SETTINGS_GAP_PX}>
        <SettingsItem label="Selected outline" htmlFor={ObjectSettingsHtmlIds.OUTLINE_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.OUTLINE_COLOR_SELECT}
            dropdownProps={{
              selected: outlineColorMode.toString(),
              items: OUTLINE_COLOR_MODE_ITEMS,
              onChange: (mode: string) => {
                setOutlineColorMode(Number.parseInt(mode, 10) as SelectionOutlineColorMode);
              },
            }}
            // Color picker
            showColorPicker={
              outlineColorMode === SelectionOutlineColorMode.USE_AUTO_COLOR ||
              outlineColorMode === SelectionOutlineColorMode.USE_CUSTOM_COLOR
            }
            colorPickerProps={{
              color: outlineColor,
              onChange: setOutlineColor,
              presets: DEFAULT_OUTLINE_COLOR_PRESETS,
            }}
            // Color ramp picker
            showColorRamp={
              outlineColorMode === SelectionOutlineColorMode.USE_AUTO_COLOR ||
              outlineColorMode === SelectionOutlineColorMode.USE_PALETTE
            }
            colorRampProps={{
              useCategoricalPalettes: true,
              selectedPalette: KNOWN_CATEGORICAL_PALETTES.get(outlinePaletteKey)?.colors,
              selectedPaletteKey: outlinePaletteKey,
              onChangePalette: (_, key) => setOutlinePaletteKey(key),
              numCategories: 12,
              showReverseButton: false,
            }}
          ></DropdownWithColorPicker>
        </SettingsItem>
        <SettingsItem label="Edge" htmlFor={ObjectSettingsHtmlIds.EDGE_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.EDGE_COLOR_SELECT}
            dropdownProps={{
              selected: edgeMode.toString(),
              items: DRAW_MODE_ITEMS,
              onChange: (mode: string) => {
                setEdgeMode(Number.parseInt(mode, 10) as DrawMode);
              },
            }}
            showColorPicker={edgeMode === DrawMode.USE_COLOR}
            colorPickerProps={{
              color: edgeColor,
              alpha: edgeColorAlpha,
              onChange: setEdgeColor,
              presets: EDGE_COLOR_PRESETS,
            }}
          />
        </SettingsItem>
        <SettingsItem label="Filtered objects" htmlFor={ObjectSettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}
            dropdownProps={{
              selected: outOfRangeDrawSettings.mode.toString(),
              onChange: (mode: string) => {
                setOutOfRangeDrawSettings({ ...outOfRangeDrawSettings, mode: Number.parseInt(mode, 10) as DrawMode });
              },
              items: DRAW_MODE_ITEMS,
            }}
            colorPickerProps={{
              color: outOfRangeDrawSettings.color,
              onChange: (color: Color) => {
                setOutOfRangeDrawSettings({ ...outOfRangeDrawSettings, color });
              },
              presets: DRAW_MODE_COLOR_PRESETS,
            }}
            showColorPicker={outOfRangeDrawSettings.mode === DrawMode.USE_COLOR}
          />
        </SettingsItem>
        <SettingsItem label="Outliers" htmlFor={ObjectSettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}
            dropdownProps={{
              selected: outlierDrawSettings.mode.toString(),
              onChange: (mode: string) => {
                setOutlierDrawSettings({ ...outlierDrawSettings, mode: Number.parseInt(mode, 10) as DrawMode });
              },
              items: DRAW_MODE_ITEMS,
            }}
            colorPickerProps={{
              color: outlierDrawSettings.color,
              onChange: (color: Color) => {
                setOutlierDrawSettings({ ...outlierDrawSettings, color });
              },
              presets: DRAW_MODE_COLOR_PRESETS,
            }}
            showColorPicker={outlierDrawSettings.mode === DrawMode.USE_COLOR}
          />
        </SettingsItem>
      </SettingsContainer>
    </ToggleCollapse>
  );
}
