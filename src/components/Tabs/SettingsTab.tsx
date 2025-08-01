import { Checkbox, Switch, Tooltip } from "antd";
import { PresetsItem } from "antd/es/color-picker/interface";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

import { OUTLINE_COLOR_DEFAULT } from "../../colorizer/constants";
import { DrawMode, TrackPathColorMode } from "../../colorizer/types";
import { FlexColumn, VisuallyHidden } from "../../styles/utils";
import { threeToAntColor } from "../../utils/color_utils";
import { SelectItem } from "../Dropdowns/types";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./Settings/constants";

import { useViewerStateStore } from "../../state/ViewerState";
import CustomCollapse from "../CustomCollapse";
import DropdownWithColorPicker from "../Dropdowns/DropdownWithColorPicker";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import LabeledSlider from "../Inputs/LabeledSlider";
import WrappedColorPicker from "../Inputs/WrappedColorPicker";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";
import VectorFieldSettings from "./Settings/VectorFieldSettings";

const enum SettingsHtmlIds {
  SHOW_BACKDROPS_CHECKBOX = "show-backdrops-checkbox",
  BACKDROP_KEY_SELECT = "backdrop-key-select",
  BACKDROP_BRIGHTNESS_SLIDER = "backdrop-brightness-slider",
  BACKDROP_SATURATION_SLIDER = "backdrop-saturation-slider",
  OBJECT_OPACITY_SLIDER = "object-opacity-slider",
  HIGHLIGHT_COLOR_PICKER = "highlight-color-picker",
  EDGE_COLOR_SELECT = "edge-color-select",
  OUTLIER_OBJECT_COLOR_SELECT = "outlier-object-color-select",
  OUTLIER_OBJECT_COLOR_PICKER = "outlier-object-color-picker",
  OUT_OF_RANGE_OBJECT_COLOR_SELECT = "out-of-range-object-color-select",
  SHOW_TRACK_PATH_SWITCH = "show-track-path-switch",
  TRACK_PATH_COLOR_SELECT = "track-path-color-select",
  TRACK_PATH_WIDTH_SLIDER = "track-path-width-slider",
  TRACK_PATH_SHOW_BREAKS_CHECKBOX = "track-path-show-breaks-checkbox",
  SCALE_BAR_SWITCH = "scale-bar-switch",
  TIMESTAMP_SWITCH = "timestamp-switch",
}

const NO_BACKDROP = {
  value: "",
  label: "(None)",
};

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

const TRACK_MODE_ITEMS: SelectItem[] = [
  { value: TrackPathColorMode.USE_OUTLINE_COLOR.toString(), label: "Outline" },
  { value: TrackPathColorMode.USE_CUSTOM_COLOR.toString(), label: "Custom" },
  { value: TrackPathColorMode.USE_FEATURE_COLOR.toString(), label: "Feature" },
];

export const SETTINGS_INDENT_PX = 24;
const SETTINGS_GAP_PX = 8;
export const MAX_SLIDER_WIDTH = "250px";

export default function SettingsTab(): ReactElement {
  // State accessors
  const backdropBrightness = useViewerStateStore((state) => state.backdropBrightness);
  const backdropKey = useViewerStateStore((state) => state.backdropKey) ?? NO_BACKDROP.value;
  const backdropSaturation = useViewerStateStore((state) => state.backdropSaturation);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const dataset = useViewerStateStore((state) => state.dataset);
  const edgeColor = useViewerStateStore((state) => state.edgeColor);
  const edgeColorAlpha = useViewerStateStore((state) => state.edgeColorAlpha);
  const edgeMode = useViewerStateStore((state) => state.edgeMode);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const outlierDrawSettings = useViewerStateStore((state) => state.outlierDrawSettings);
  const outlineColor = useViewerStateStore((state) => state.outlineColor);
  const outOfRangeDrawSettings = useViewerStateStore((state) => state.outOfRangeDrawSettings);
  const setBackdropBrightness = useViewerStateStore((state) => state.setBackdropBrightness);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropSaturation = useViewerStateStore((state) => state.setBackdropSaturation);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setEdgeColor = useViewerStateStore((state) => state.setEdgeColor);
  const setEdgeMode = useViewerStateStore((state) => state.setEdgeMode);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);
  const setOutlierDrawSettings = useViewerStateStore((state) => state.setOutlierDrawSettings);
  const setOutlineColor = useViewerStateStore((state) => state.setOutlineColor);
  const setOutOfRangeDrawSettings = useViewerStateStore((state) => state.setOutOfRangeDrawSettings);
  const setShowScaleBar = useViewerStateStore((state) => state.setShowScaleBar);
  const setShowTimestamp = useViewerStateStore((state) => state.setShowTimestamp);
  const setShowTrackPath = useViewerStateStore((state) => state.setShowTrackPath);
  const setTrackPathColor = useViewerStateStore((state) => state.setTrackPathColor);
  const setTrackPathColorMode = useViewerStateStore((state) => state.setTrackPathColorMode);
  const setTrackPathWidthPx = useViewerStateStore((state) => state.setTrackPathWidthPx);
  const setShowTrackPathBreaks = useViewerStateStore((state) => state.setShowTrackPathBreaks);
  const showScaleBar = useViewerStateStore((state) => state.showScaleBar);
  const showTimestamp = useViewerStateStore((state) => state.showTimestamp);
  const showTrackPath = useViewerStateStore((state) => state.showTrackPath);
  const showTrackPathBreaks = useViewerStateStore((state) => state.showTrackPathBreaks);
  const trackPathColor = useViewerStateStore((state) => state.trackPathColor);
  const trackPathColorMode = useViewerStateStore((state) => state.trackPathColorMode);
  const trackPathWidthPx = useViewerStateStore((state) => state.trackPathWidthPx);

  let backdropOptions = useMemo(
    () =>
      dataset
        ? Array.from(dataset.getBackdropData().entries()).map(([key, data]) => ({ value: key, label: data.name }))
        : [],
    [dataset]
  );

  const isBackdropDisabled = backdropOptions.length === 0 || backdropKey === null;
  const isBackdropOptionsDisabled = isBackdropDisabled || !backdropVisible;
  let selectedBackdropKey = backdropKey ?? NO_BACKDROP.value;
  if (isBackdropDisabled) {
    backdropOptions = [NO_BACKDROP];
    selectedBackdropKey = NO_BACKDROP.value;
  }

  return (
    <FlexColumn $gap={5}>
      <CustomCollapse label="Backdrop">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <SettingsItem label={"Show backdrops"} htmlFor={SettingsHtmlIds.SHOW_BACKDROPS_CHECKBOX}>
            <div style={{ width: "fit-content" }}>
              <Checkbox
                id={SettingsHtmlIds.SHOW_BACKDROPS_CHECKBOX}
                type="checkbox"
                disabled={isBackdropDisabled}
                checked={backdropVisible}
                onChange={(event) => setBackdropVisible(event.target.checked)}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Backdrop" htmlFor={SettingsHtmlIds.BACKDROP_KEY_SELECT}>
            <SelectionDropdown
              id={SettingsHtmlIds.BACKDROP_KEY_SELECT}
              selected={selectedBackdropKey}
              items={backdropOptions}
              onChange={(key) => dataset && setBackdropKey(key)}
              disabled={isBackdropOptionsDisabled}
            />
          </SettingsItem>
          <SettingsItem label="Brightness" htmlFor={SettingsHtmlIds.BACKDROP_BRIGHTNESS_SLIDER}>
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                id={SettingsHtmlIds.BACKDROP_BRIGHTNESS_SLIDER}
                type="value"
                minSliderBound={0}
                maxSliderBound={200}
                minInputBound={0}
                maxInputBound={200}
                value={backdropBrightness}
                onChange={setBackdropBrightness}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
                disabled={isBackdropOptionsDisabled}
              />
            </div>
          </SettingsItem>

          <SettingsItem label="Saturation" htmlFor={SettingsHtmlIds.BACKDROP_SATURATION_SLIDER}>
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                id={SettingsHtmlIds.BACKDROP_SATURATION_SLIDER}
                type="value"
                minSliderBound={0}
                maxSliderBound={100}
                minInputBound={0}
                maxInputBound={100}
                value={backdropSaturation}
                onChange={setBackdropSaturation}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
                disabled={isBackdropOptionsDisabled}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Object opacity" htmlFor={SettingsHtmlIds.OBJECT_OPACITY_SLIDER}>
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                id={SettingsHtmlIds.OBJECT_OPACITY_SLIDER}
                type="value"
                disabled={isBackdropOptionsDisabled}
                minSliderBound={0}
                maxSliderBound={100}
                minInputBound={0}
                maxInputBound={100}
                value={objectOpacity}
                onChange={setObjectOpacity}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
              />
            </div>
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>

      <CustomCollapse label="Objects">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <SettingsItem label="Highlight" htmlFor={SettingsHtmlIds.HIGHLIGHT_COLOR_PICKER}>
            {/* NOTE: 'Highlight color' is 'outline' internally, and 'Outline color' is 'edge' for legacy reasons. */}
            <WrappedColorPicker
              id={SettingsHtmlIds.HIGHLIGHT_COLOR_PICKER}
              style={{ width: "min-content" }}
              size="small"
              disabledAlpha={true}
              defaultValue={OUTLINE_COLOR_DEFAULT}
              onChange={(_color, hex) => setOutlineColor(new Color(hex as ColorRepresentation))}
              value={threeToAntColor(outlineColor)}
              presets={DEFAULT_OUTLINE_COLOR_PRESETS}
            />
          </SettingsItem>
          <SettingsItem label="Outline" htmlFor={SettingsHtmlIds.EDGE_COLOR_SELECT}>
            <DropdownWithColorPicker
              id={SettingsHtmlIds.EDGE_COLOR_SELECT}
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
          <SettingsItem label="Filtered objects" htmlFor={SettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}>
            <DropdownWithColorPicker
              id={SettingsHtmlIds.OUT_OF_RANGE_OBJECT_COLOR_SELECT}
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
          <SettingsItem label="Outliers" htmlFor={SettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}>
            <DropdownWithColorPicker
              id={SettingsHtmlIds.OUTLIER_OBJECT_COLOR_SELECT}
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

          <SettingsItem
            label={"Track path"}
            htmlFor={SettingsHtmlIds.SHOW_TRACK_PATH_SWITCH}
            labelStyle={{ height: "min-content" }}
            style={{ marginTop: "15px" }}
          >
            <div>
              <Switch
                id={SettingsHtmlIds.SHOW_TRACK_PATH_SWITCH}
                checked={showTrackPath}
                onChange={setShowTrackPath}
              ></Switch>
            </div>
          </SettingsItem>
          {showTrackPath && (
            <>
              <SettingsItem label="Color" htmlFor={SettingsHtmlIds.TRACK_PATH_COLOR_SELECT}>
                <DropdownWithColorPicker
                  id={SettingsHtmlIds.TRACK_PATH_COLOR_SELECT}
                  selected={trackPathColorMode.toString()}
                  items={TRACK_MODE_ITEMS}
                  onValueChange={(value) => setTrackPathColorMode(Number.parseInt(value, 10) as TrackPathColorMode)}
                  onColorChange={setTrackPathColor}
                  color={trackPathColor}
                  presets={DEFAULT_OUTLINE_COLOR_PRESETS}
                  showColorPicker={trackPathColorMode === TrackPathColorMode.USE_CUSTOM_COLOR}
                />
              </SettingsItem>
              <SettingsItem label="Width" htmlFor={SettingsHtmlIds.TRACK_PATH_WIDTH_SLIDER}>
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
                    id={SettingsHtmlIds.TRACK_PATH_WIDTH_SLIDER}
                    type="value"
                    minSliderBound={1}
                    maxSliderBound={5}
                    minInputBound={0}
                    maxInputBound={100}
                    precision={1}
                    value={trackPathWidthPx}
                    onChange={setTrackPathWidthPx}
                    marks={[1.5]}
                    step={0.1}
                    numberFormatter={(value?: number) => `${value?.toFixed(1)}`}
                  />
                </div>
              </SettingsItem>
              <SettingsItem
                label={"Show breaks"}
                htmlFor={SettingsHtmlIds.TRACK_PATH_SHOW_BREAKS_CHECKBOX}
                labelStyle={{ height: "min-content" }}
                style={{ marginBottom: "20px", marginTop: "-5px" }}
              >
                <Tooltip title="Show breaks in the track path where the track is not continuous." placement="right">
                  <div style={{ width: "fit-content" }}>
                    <VisuallyHidden>Show breaks in the track path where the track is not continuous.</VisuallyHidden>
                    <Checkbox
                      id={SettingsHtmlIds.TRACK_PATH_SHOW_BREAKS_CHECKBOX}
                      type="checkbox"
                      checked={showTrackPathBreaks}
                      onChange={(event) => {
                        setShowTrackPathBreaks(event.target.checked);
                      }}
                    ></Checkbox>
                  </div>
                </Tooltip>
              </SettingsItem>
            </>
          )}
          <SettingsItem label="Scale bar" htmlFor={SettingsHtmlIds.SCALE_BAR_SWITCH}>
            <div>
              <Switch id={SettingsHtmlIds.SCALE_BAR_SWITCH} checked={showScaleBar} onChange={setShowScaleBar} />
            </div>
          </SettingsItem>
          <SettingsItem label="Timestamp" htmlFor={SettingsHtmlIds.TIMESTAMP_SWITCH}>
            <div>
              <Switch id={SettingsHtmlIds.TIMESTAMP_SWITCH} checked={showTimestamp} onChange={setShowTimestamp} />
            </div>
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>

      <CustomCollapse label="Vector arrows">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <VectorFieldSettings />
        </SettingsContainer>
      </CustomCollapse>
      <div style={{ height: "100px" }}></div>
    </FlexColumn>
  );
}
