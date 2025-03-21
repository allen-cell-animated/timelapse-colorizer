import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { DrawMode, TabType } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { useViewerStateStore } from "../../../src/state";
import { ConfigSlice, loadConfigSliceFromParams, serializeConfigSlice } from "../../../src/state/slices";
import { SerializedStoreData } from "../../../src/state/types";
import { compareRecord } from "./utils";

const EXAMPLE_SLICE_1: Partial<ConfigSlice> = {
  showTrackPath: false,
  showScaleBar: false,
  showTimestamp: false,
  outOfRangeDrawSettings: { color: new Color(0xff0000), mode: DrawMode.USE_COLOR },
  outlierDrawSettings: { color: new Color(0x00ff00), mode: DrawMode.USE_COLOR },
  outlineColor: new Color(0x0000ff),
  openTab: TabType.SCATTER_PLOT,
};

const EXAMPLE_SLICE_1_PARAMS: SerializedStoreData = {
  [UrlParam.SHOW_PATH]: "0",
  [UrlParam.SHOW_SCALEBAR]: "0",
  [UrlParam.SHOW_TIMESTAMP]: "0",
  [UrlParam.FILTERED_COLOR]: "ff0000",
  [UrlParam.FILTERED_MODE]: DrawMode.USE_COLOR.toString(),
  [UrlParam.OUTLIER_COLOR]: "00ff00",
  [UrlParam.OUTLIER_MODE]: DrawMode.USE_COLOR.toString(),
  [UrlParam.OUTLINE_COLOR]: "0000ff",
  [UrlParam.OPEN_TAB]: TabType.SCATTER_PLOT,
};

const EXAMPLE_SLICE_2: Partial<ConfigSlice> = {
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  outOfRangeDrawSettings: { color: new Color(0xffff00), mode: DrawMode.HIDE },
  outlierDrawSettings: { color: new Color(0x00ffff), mode: DrawMode.HIDE },
  outlineColor: new Color(0xff00ff),
  openTab: TabType.SETTINGS,
};

const EXAMPLE_SLICE_2_PARAMS: SerializedStoreData = {
  [UrlParam.SHOW_PATH]: "1",
  [UrlParam.SHOW_SCALEBAR]: "1",
  [UrlParam.SHOW_TIMESTAMP]: "1",
  [UrlParam.FILTERED_COLOR]: "ffff00",
  [UrlParam.FILTERED_MODE]: DrawMode.HIDE.toString(),
  [UrlParam.OUTLIER_COLOR]: "00ffff",
  [UrlParam.OUTLIER_MODE]: DrawMode.HIDE.toString(),
  [UrlParam.OUTLINE_COLOR]: "ff00ff",
  [UrlParam.OPEN_TAB]: TabType.SETTINGS,
};

describe("ConfigSlice", () => {
  it("can set properties", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setShowTrackPath(false);
      result.current.setShowScaleBar(false);
      result.current.setShowTimestamp(false);
      result.current.setShowLegendDuringExport(false);
      result.current.setShowHeaderDuringExport(false);
      result.current.setOutOfRangeDrawSettings({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
      result.current.setOutlierDrawSettings({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
      result.current.setOutlineColor(new Color(0x0000ff));
      result.current.setOpenTab(TabType.FILTERS);
    });

    expect(result.current.showTrackPath).toBe(false);
    expect(result.current.showScaleBar).toBe(false);
    expect(result.current.showTimestamp).toBe(false);
    expect(result.current.showLegendDuringExport).toBe(false);
    expect(result.current.showHeaderDuringExport).toBe(false);
    expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
    expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
    expect(result.current.outlineColor).toEqual(new Color(0x0000ff));
    expect(result.current.openTab).toBe(TabType.FILTERS);

    act(() => {
      result.current.setShowTrackPath(true);
      result.current.setShowScaleBar(true);
      result.current.setShowTimestamp(true);
      result.current.setShowLegendDuringExport(true);
      result.current.setShowHeaderDuringExport(true);
      result.current.setOutOfRangeDrawSettings({ color: new Color(0x00ff00), mode: DrawMode.HIDE });
      result.current.setOutlierDrawSettings({ color: new Color(0xff0000), mode: DrawMode.HIDE });
      result.current.setOutlineColor(new Color(0x00ff00));
      result.current.setOpenTab(TabType.TRACK_PLOT);
    });
    expect(result.current.showTrackPath).toBe(true);
    expect(result.current.showScaleBar).toBe(true);
    expect(result.current.showTimestamp).toBe(true);
    expect(result.current.showLegendDuringExport).toBe(true);
    expect(result.current.showHeaderDuringExport).toBe(true);
    expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0x00ff00), mode: DrawMode.HIDE });
    expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0xff0000), mode: DrawMode.HIDE });
    expect(result.current.outlineColor).toEqual(new Color(0x00ff00));
    expect(result.current.openTab).toBe(TabType.TRACK_PLOT);
  });

  describe("serializeConfigSlice", () => {
    it("serializes config settings", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        useViewerStateStore.setState(EXAMPLE_SLICE_1);
      });
      let serializedData = serializeConfigSlice(result.current);
      compareRecord(serializedData, EXAMPLE_SLICE_1_PARAMS);

      act(() => {
        useViewerStateStore.setState(EXAMPLE_SLICE_2);
      });
      serializedData = serializeConfigSlice(result.current);
      compareRecord(serializedData, EXAMPLE_SLICE_2_PARAMS);
    });
  });

  describe("loadConfigSliceFromParams", () => {
    it("loads basic config settings", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        loadConfigSliceFromParams(result.current, new URLSearchParams(EXAMPLE_SLICE_1_PARAMS));
      });
      compareRecord(result.current, EXAMPLE_SLICE_1);

      act(() => {
        loadConfigSliceFromParams(result.current, new URLSearchParams(EXAMPLE_SLICE_2_PARAMS));
      });
      compareRecord(result.current, EXAMPLE_SLICE_2);
    });

    it("ignores invalid draw setting modes", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialOutOfRangeDrawSettings = result.current.outOfRangeDrawSettings;
      const initialOutlierDrawSettings = result.current.outlierDrawSettings;
      const params = new URLSearchParams();
      params.set(UrlParam.FILTERED_MODE, "invalid");
      params.set(UrlParam.OUTLIER_MODE, "invalid");
      act(() => {
        loadConfigSliceFromParams(result.current, params);
      });
      expect(result.current.outOfRangeDrawSettings).toStrictEqual(initialOutOfRangeDrawSettings);
      expect(result.current.outlierDrawSettings).toStrictEqual(initialOutlierDrawSettings);
    });

    it("ignores invalid tabs", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialOpenTab = result.current.openTab;
      const params = new URLSearchParams();
      params.set(UrlParam.OPEN_TAB, "invalid");
      act(() => {
        loadConfigSliceFromParams(result.current, params);
      });
      expect(result.current.openTab).toBe(initialOpenTab);
    });
  });
});
