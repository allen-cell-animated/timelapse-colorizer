import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { DrawMode, TabType, TrackPathColorMode } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { useViewerStateStore } from "../../../src/state";
import { ConfigSlice, loadConfigSliceFromParams, serializeConfigSlice } from "../../../src/state/slices";
import { SerializedStoreData } from "../../../src/state/types";
import { compareRecord } from "./utils";

const EXAMPLE_SLICE_1: Partial<ConfigSlice> = {
  showTrackPath: false,
  trackPathColor: new Color(0x00ff00),
  trackPathWidthPx: 2,
  trackPathColorMode: TrackPathColorMode.USE_CUSTOM_COLOR,
  showTrackPathBreaks: false,
  showScaleBar: false,
  showTimestamp: false,
  outOfRangeDrawSettings: { color: new Color(0xff0000), mode: DrawMode.USE_COLOR },
  outlierDrawSettings: { color: new Color(0x00ff00), mode: DrawMode.USE_COLOR },
  outlineColor: new Color(0x0000ff),
  edgeColor: new Color(0x808080),
  edgeColorAlpha: 128 / 255, // 0x80
  edgeMode: DrawMode.USE_COLOR,
  openTab: TabType.SCATTER_PLOT,
};

const EXAMPLE_SLICE_1_PARAMS: SerializedStoreData = {
  [UrlParam.SHOW_PATH]: "0",
  [UrlParam.PATH_COLOR]: "00ff00",
  [UrlParam.PATH_WIDTH]: "2",
  [UrlParam.PATH_COLOR_MODE]: TrackPathColorMode.USE_CUSTOM_COLOR.toString(),
  [UrlParam.SHOW_PATH_BREAKS]: "0",
  [UrlParam.SHOW_SCALEBAR]: "0",
  [UrlParam.SHOW_TIMESTAMP]: "0",
  [UrlParam.FILTERED_COLOR]: "ff0000",
  [UrlParam.FILTERED_MODE]: DrawMode.USE_COLOR.toString(),
  [UrlParam.OUTLIER_COLOR]: "00ff00",
  [UrlParam.OUTLIER_MODE]: DrawMode.USE_COLOR.toString(),
  [UrlParam.OUTLINE_COLOR]: "0000ff",
  [UrlParam.EDGE_COLOR]: "80808080",
  [UrlParam.EDGE_MODE]: "1",
  [UrlParam.OPEN_TAB]: TabType.SCATTER_PLOT,
};

const EXAMPLE_SLICE_2: Partial<ConfigSlice> = {
  showTrackPath: true,
  trackPathColor: new Color(0xffff00),
  trackPathWidthPx: 3,
  trackPathColorMode: TrackPathColorMode.USE_OUTLINE_COLOR,
  showTrackPathBreaks: true,
  showScaleBar: true,
  showTimestamp: true,
  outOfRangeDrawSettings: { color: new Color(0xffff00), mode: DrawMode.HIDE },
  outlierDrawSettings: { color: new Color(0x00ffff), mode: DrawMode.HIDE },
  outlineColor: new Color(0xff00ff),
  edgeColor: new Color(0xa0b0c0),
  edgeColorAlpha: 208 / 255, // 0xd0
  edgeMode: DrawMode.HIDE,
  openTab: TabType.SETTINGS,
};

const EXAMPLE_SLICE_2_PARAMS: SerializedStoreData = {
  [UrlParam.SHOW_PATH]: "1",
  [UrlParam.PATH_COLOR]: "ffff00",
  [UrlParam.PATH_WIDTH]: "3",
  [UrlParam.PATH_COLOR_MODE]: TrackPathColorMode.USE_OUTLINE_COLOR.toString(),
  [UrlParam.SHOW_PATH_BREAKS]: "1",
  [UrlParam.SHOW_SCALEBAR]: "1",
  [UrlParam.SHOW_TIMESTAMP]: "1",
  [UrlParam.FILTERED_COLOR]: "ffff00",
  [UrlParam.FILTERED_MODE]: DrawMode.HIDE.toString(),
  [UrlParam.OUTLIER_COLOR]: "00ffff",
  [UrlParam.OUTLIER_MODE]: DrawMode.HIDE.toString(),
  [UrlParam.OUTLINE_COLOR]: "ff00ff",
  [UrlParam.EDGE_COLOR]: "a0b0c0d0",
  [UrlParam.EDGE_MODE]: DrawMode.HIDE.toString(),
  [UrlParam.OPEN_TAB]: TabType.SETTINGS,
};

describe("ConfigSlice", () => {
  it("can set properties", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setShowTrackPath(false);
      result.current.setTrackPathColor(new Color(0x00ff00));
      result.current.setTrackPathWidthPx(2);
      result.current.setTrackPathColorMode(TrackPathColorMode.USE_CUSTOM_COLOR);
      result.current.setShowTrackPathBreaks(false);
      result.current.setShowScaleBar(false);
      result.current.setShowTimestamp(false);
      result.current.setShowLegendDuringExport(false);
      result.current.setShowHeaderDuringExport(false);
      result.current.setOutOfRangeDrawSettings({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
      result.current.setOutlierDrawSettings({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
      result.current.setOutlineColor(new Color(0x0000ff));
      result.current.setEdgeColor(new Color(0x808080), 128 / 255); // 0x80
      result.current.setEdgeMode(DrawMode.USE_COLOR);
      result.current.setOpenTab(TabType.FILTERS);
    });

    expect(result.current.showTrackPath).toBe(false);
    expect(result.current.trackPathColor).toEqual(new Color(0x00ff00));
    expect(result.current.trackPathWidthPx).toBe(2);
    expect(result.current.trackPathColorMode).toBe(TrackPathColorMode.USE_CUSTOM_COLOR);
    expect(result.current.showTrackPathBreaks).toBe(false);
    expect(result.current.showScaleBar).toBe(false);
    expect(result.current.showTimestamp).toBe(false);
    expect(result.current.showLegendDuringExport).toBe(false);
    expect(result.current.showHeaderDuringExport).toBe(false);
    expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
    expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
    expect(result.current.outlineColor).toEqual(new Color(0x0000ff));
    expect(result.current.edgeColor).toEqual(new Color(0x808080));
    expect(result.current.edgeColorAlpha).toBe(128 / 255);
    expect(result.current.edgeMode).toBe(DrawMode.USE_COLOR);
    expect(result.current.openTab).toBe(TabType.FILTERS);

    act(() => {
      result.current.setShowTrackPath(true);
      result.current.setTrackPathColor(new Color(0xffff00));
      result.current.setTrackPathWidthPx(3);
      result.current.setTrackPathColorMode(TrackPathColorMode.USE_OUTLINE_COLOR);
      result.current.setShowTrackPathBreaks(true);
      result.current.setShowScaleBar(true);
      result.current.setShowTimestamp(true);
      result.current.setShowLegendDuringExport(true);
      result.current.setShowHeaderDuringExport(true);
      result.current.setOutOfRangeDrawSettings({ color: new Color(0x00ff00), mode: DrawMode.HIDE });
      result.current.setOutlierDrawSettings({ color: new Color(0xff0000), mode: DrawMode.HIDE });
      result.current.setOutlineColor(new Color(0x00ff00));
      result.current.setEdgeColor(new Color(0xa0b0c0), 208 / 255); // 0xd0
      result.current.setEdgeMode(DrawMode.HIDE);
      result.current.setOpenTab(TabType.TRACK_PLOT);
    });
    expect(result.current.showTrackPath).toBe(true);
    expect(result.current.trackPathColor).toEqual(new Color(0xffff00));
    expect(result.current.trackPathWidthPx).toBe(3);
    expect(result.current.trackPathColorMode).toBe(TrackPathColorMode.USE_OUTLINE_COLOR);
    expect(result.current.showTrackPathBreaks).toBe(true);
    expect(result.current.showScaleBar).toBe(true);
    expect(result.current.showTimestamp).toBe(true);
    expect(result.current.showLegendDuringExport).toBe(true);
    expect(result.current.showHeaderDuringExport).toBe(true);
    expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0x00ff00), mode: DrawMode.HIDE });
    expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0xff0000), mode: DrawMode.HIDE });
    expect(result.current.outlineColor).toEqual(new Color(0x00ff00));
    expect(result.current.edgeColor).toEqual(new Color(0xa0b0c0));
    expect(result.current.edgeColorAlpha).toBe(208 / 255);
    expect(result.current.openTab).toBe(TabType.TRACK_PLOT);
  });

  it("clamps track path width", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setTrackPathWidthPx(1);
    });
    expect(result.current.trackPathWidthPx).toBe(1);

    act(() => {
      result.current.setTrackPathWidthPx(-10);
    });
    expect(result.current.trackPathWidthPx).toBe(0);

    act(() => {
      result.current.setTrackPathWidthPx(100000);
    });
    expect(result.current.trackPathWidthPx).toBe(100);
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
