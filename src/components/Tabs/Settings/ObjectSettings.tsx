import type { PresetsItem } from "antd/es/color-picker/interface";
import React, { type ReactElement } from "react";
import { Color, type ColorRepresentation } from "three";

import { DrawMode, OUTLINE_COLOR_DEFAULT } from "src/colorizer";
import DropdownWithColorPicker from "src/components/Dropdowns/DropdownWithColorPicker";
import type { SelectItem } from "src/components/Dropdowns/types";
import WrappedColorPicker from "src/components/Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { useViewerStateStore } from "src/state";
import { threeToAntColor } from "src/utils/color_utils";

import { DEFAULT_OUTLINE_COLOR_PRESETS, SETTINGS_GAP_PX } from "./constants";

const enum ObjectSettingsHtmlIds {
  HIGHLIGHT_COLOR_PICKER = "highlight-color-picker",
  EDGE_COLOR_SELECT = "edge-color-select",
  OUTLIER_OBJECT_COLOR_SELECT = "outlier-object-color-select",
  OUTLIER_OBJECT_COLOR_PICKER = "outlier-object-color-picker",
  OUT_OF_RANGE_OBJECT_COLOR_SELECT = "out-of-range-object-color-select",
}

const DRAW_MODE_ITEMS: SelectItem[] = [
  { value: DrawMode.HIDE.toString(), label: "Hide" },
  { value: DrawMode.USE_COLOR.toString(), label: "Use color" },
];

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

export default function ObjectSettings(): ReactElement {
  const edgeColor = useViewerStateStore((state) => state.edgeColor);
  const edgeColorAlpha = useViewerStateStore((state) => state.edgeColorAlpha);
  const edgeMode = useViewerStateStore((state) => state.edgeMode);
  const outlierDrawSettings = useViewerStateStore((state) => state.outlierDrawSettings);
  const outlineColor = useViewerStateStore((state) => state.outlineColor);
  const outOfRangeDrawSettings = useViewerStateStore((state) => state.outOfRangeDrawSettings);
  const setEdgeColor = useViewerStateStore((state) => state.setEdgeColor);
  const setEdgeMode = useViewerStateStore((state) => state.setEdgeMode);
  const setOutlierDrawSettings = useViewerStateStore((state) => state.setOutlierDrawSettings);
  const setOutlineColor = useViewerStateStore((state) => state.setOutlineColor);
  const setOutOfRangeDrawSettings = useViewerStateStore((state) => state.setOutOfRangeDrawSettings);

  return (
    <ToggleCollapse label="Objects">
      <SettingsContainer gapPx={SETTINGS_GAP_PX}>
        <SettingsItem label="Highlight" htmlFor={ObjectSettingsHtmlIds.HIGHLIGHT_COLOR_PICKER}>
          {/* NOTE: 'Highlight color' is 'outline' internally, and 'Outline color' is 'edge' for legacy reasons. */}
          <WrappedColorPicker
            id={ObjectSettingsHtmlIds.HIGHLIGHT_COLOR_PICKER}
            style={{ width: "min-content" }}
            size="small"
            disabledAlpha={true}
            defaultValue={OUTLINE_COLOR_DEFAULT}
            onChange={(_color, hex) => setOutlineColor(new Color(hex as ColorRepresentation))}
            value={threeToAntColor(outlineColor)}
            presets={DEFAULT_OUTLINE_COLOR_PRESETS}
          />
        </SettingsItem>
        <SettingsItem label="Outline" htmlFor={ObjectSettingsHtmlIds.EDGE_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.EDGE_COLOR_SELECT}
            selected={edgeMode.toString()}
            items={DRAW_MODE_ITEMS}
            onValueChange={(mode: string) => {
              setEdgeMode(Number.parseInt(mode, 10) as DrawMode);
            }}
            showColorPicker={edgeMode === DrawMode.USE_COLOR}
            color={edgeColor}
            alpha={edgeColorAlpha}
            onColorChange={setEdgeColor}
            presets={EDGE_COLOR_PRESETS}
          />
        </SettingsItem>
        <SettingsItem label="Filtered objects" htmlFor={ObjectSettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}
            selected={outOfRangeDrawSettings.mode.toString()}
            color={outOfRangeDrawSettings.color}
            onValueChange={(mode: string) => {
              setOutOfRangeDrawSettings({ ...outOfRangeDrawSettings, mode: Number.parseInt(mode, 10) as DrawMode });
            }}
            onColorChange={(color: Color) => {
              setOutOfRangeDrawSettings({ ...outOfRangeDrawSettings, color });
            }}
            showColorPicker={outOfRangeDrawSettings.mode === DrawMode.USE_COLOR}
            items={DRAW_MODE_ITEMS}
            presets={DRAW_MODE_COLOR_PRESETS}
          />
        </SettingsItem>
        <SettingsItem label="Outliers" htmlFor={ObjectSettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}>
          <DropdownWithColorPicker
            id={ObjectSettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}
            selected={outlierDrawSettings.mode.toString()}
            color={outlierDrawSettings.color}
            onValueChange={(mode: string) => {
              setOutlierDrawSettings({ ...outlierDrawSettings, mode: Number.parseInt(mode, 10) as DrawMode });
            }}
            onColorChange={(color: Color) => {
              setOutlierDrawSettings({ ...outlierDrawSettings, color });
            }}
            showColorPicker={outlierDrawSettings.mode === DrawMode.USE_COLOR}
            items={DRAW_MODE_ITEMS}
            presets={DRAW_MODE_COLOR_PRESETS}
          />
        </SettingsItem>
      </SettingsContainer>
    </ToggleCollapse>
  );
}
