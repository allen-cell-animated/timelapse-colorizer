import { Color as AntdColor } from "@rc-component/color-picker";
import { Checkbox, ColorPicker, Switch, Tooltip } from "antd";
import { PresetsItem } from "antd/es/color-picker/interface";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

import { OUTLINE_COLOR_DEFAULT } from "../../colorizer/constants";
import { DrawMode, TrackPathColorMode } from "../../colorizer/types";
import { FlexColumn, VisuallyHidden } from "../../styles/utils";
import { SelectItem } from "../Dropdowns/types";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./Settings/constants";

import { useViewerStateStore } from "../../state/ViewerState";
import CustomCollapse from "../CustomCollapse";
import DropdownWithColorPicker from "../Dropdowns/DropdownWithColorPicker";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import LabeledSlider from "../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";
import VectorFieldSettings from "./Settings/VectorFieldSettings";

const NO_BACKDROP = {
  value: "",
  label: "(None)",
};

const DRAW_MODE_ITEMS: SelectItem[] = [
  { value: DrawMode.HIDE.toString(), label: "Hide" },
  { value: DrawMode.USE_COLOR.toString(), label: "Custom" },
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

  console.log("#" + edgeColor.getHexString() + (edgeColorAlpha * 255).toString(16).padStart(2, "0"));

  return (
    <FlexColumn $gap={5}>
      <CustomCollapse label="Backdrop">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <SettingsItem label={"Show backdrops"}>
            <Checkbox
              type="checkbox"
              disabled={isBackdropDisabled}
              checked={backdropVisible}
              onChange={(event) => setBackdropVisible(event.target.checked)}
            />
          </SettingsItem>
          <SettingsItem label="Backdrop">
            <SelectionDropdown
              selected={selectedBackdropKey}
              items={backdropOptions}
              onChange={(key) => dataset && setBackdropKey(key)}
              disabled={isBackdropOptionsDisabled}
            />
          </SettingsItem>
          <SettingsItem label="Brightness">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
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

          <SettingsItem label="Saturation">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
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
          <SettingsItem label="Object opacity">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
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
          <SettingsItem label="Outline color">
            <div>
              <ColorPicker
                style={{ width: "min-content" }}
                size="small"
                disabledAlpha={true}
                defaultValue={new AntdColor(OUTLINE_COLOR_DEFAULT)}
                onChange={(_color, hex) => setOutlineColor(new Color(hex as ColorRepresentation))}
                value={new AntdColor(outlineColor.getHexString())}
                presets={DEFAULT_OUTLINE_COLOR_PRESETS}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Edge color" id="edge-color-label">
            <DropdownWithColorPicker
              htmlLabelId="edge-color-label"
              selected={edgeMode.toString()}
              items={DRAW_MODE_ITEMS}
              onValueChange={(mode: string) => {
                setEdgeMode(Number.parseInt(mode, 10) as DrawMode);
              }}
              showColorPicker={edgeMode === DrawMode.USE_COLOR}
              color={
                new AntdColor("#" + edgeColor.getHexString() + (edgeColorAlpha * 255).toString(16).padStart(2, "0"))
              }
              onColorChange={setEdgeColor}
              alpha={edgeColorAlpha}
              presets={EDGE_COLOR_PRESETS}
            />
          </SettingsItem>
          <SettingsItem label="Filtered object color" id="filtered-object-color-label">
            <DropdownWithColorPicker
              htmlLabelId="filtered-object-color-label"
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
          <SettingsItem label="Outlier object color" id="outlier-object-color-label">
            <DropdownWithColorPicker
              htmlLabelId="outlier-object-color-label"
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
            labelStyle={{ height: "min-content" }}
            id="track-path-label"
            style={{ marginTop: "15px" }}
          >
            <div>
              <Switch checked={showTrackPath} onChange={setShowTrackPath}></Switch>
            </div>
          </SettingsItem>
          {showTrackPath && (
            <>
              <SettingsItem label="Track path color" id="track-path-color-label">
                <DropdownWithColorPicker
                  selected={trackPathColorMode.toString()}
                  items={TRACK_MODE_ITEMS}
                  htmlLabelId={"track-path-color-label"}
                  onValueChange={(value) => setTrackPathColorMode(Number.parseInt(value, 10) as TrackPathColorMode)}
                  onColorChange={setTrackPathColor}
                  color={trackPathColor}
                  presets={DEFAULT_OUTLINE_COLOR_PRESETS}
                  showColorPicker={trackPathColorMode === TrackPathColorMode.USE_CUSTOM_COLOR}
                />
              </SettingsItem>
              <SettingsItem label="Track path width">
                <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
                  <LabeledSlider
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
                labelStyle={{ height: "min-content" }}
                style={{ marginBottom: "20px", marginTop: "-5px" }}
              >
                <Tooltip title="Show breaks in the track path where the track is not continuous." placement="right">
                  <div style={{ width: "fit-content" }}>
                    <VisuallyHidden>Show breaks in the track path where the track is not continuous.</VisuallyHidden>
                    <Checkbox
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
          <SettingsItem label="Scale bar">
            <div>
              <Switch checked={showScaleBar} onChange={setShowScaleBar} />
            </div>
          </SettingsItem>
          <SettingsItem label="Timestamp">
            <div>
              <Switch checked={showTimestamp} onChange={setShowTimestamp} />
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
