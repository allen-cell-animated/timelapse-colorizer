import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { DrawMode, TabType } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { useViewerStateStore } from "../../../src/state";
import { loadConfigSliceFromParams, serializeConfigSlice } from "../../../src/state/slices";

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
        result.current.setShowTrackPath(false);
        result.current.setShowScaleBar(false);
        result.current.setShowTimestamp(false);
        result.current.setOutOfRangeDrawSettings({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
        result.current.setOutlierDrawSettings({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
        result.current.setOutlineColor(new Color(0x0000ff));
        result.current.setOpenTab(TabType.SCATTER_PLOT);
      });
      let serializedData = serializeConfigSlice(result.current);
      expect(serializedData[UrlParam.SHOW_PATH]).toBe("0");
      expect(serializedData[UrlParam.SHOW_SCALEBAR]).toBe("0");
      expect(serializedData[UrlParam.SHOW_TIMESTAMP]).toBe("0");
      expect(serializedData[UrlParam.FILTERED_COLOR]).toBe("ff0000");
      expect(serializedData[UrlParam.FILTERED_MODE]).toBe(DrawMode.USE_COLOR.toString());
      expect(serializedData[UrlParam.OUTLIER_COLOR]).toBe("00ff00");
      expect(serializedData[UrlParam.OUTLIER_MODE]).toBe(DrawMode.USE_COLOR.toString());
      expect(serializedData[UrlParam.OUTLINE_COLOR]).toBe("0000ff");
      expect(serializedData[UrlParam.OPEN_TAB]).toBe(TabType.SCATTER_PLOT);

      act(() => {
        result.current.setShowTrackPath(true);
        result.current.setShowScaleBar(true);
        result.current.setShowTimestamp(true);
        result.current.setOutOfRangeDrawSettings({ color: new Color(0xffff00), mode: DrawMode.HIDE });
        result.current.setOutlierDrawSettings({ color: new Color(0x00ffff), mode: DrawMode.HIDE });
        result.current.setOutlineColor(new Color(0xff00ff));
        result.current.setOpenTab(TabType.SETTINGS);
      });
      serializedData = serializeConfigSlice(result.current);
      expect(serializedData[UrlParam.SHOW_PATH]).toBe("1");
      expect(serializedData[UrlParam.SHOW_SCALEBAR]).toBe("1");
      expect(serializedData[UrlParam.SHOW_TIMESTAMP]).toBe("1");
      expect(serializedData[UrlParam.FILTERED_COLOR]).toBe("ffff00");
      expect(serializedData[UrlParam.FILTERED_MODE]).toBe(DrawMode.HIDE.toString());
      expect(serializedData[UrlParam.OUTLIER_COLOR]).toBe("00ffff");
      expect(serializedData[UrlParam.OUTLIER_MODE]).toBe(DrawMode.HIDE.toString());
      expect(serializedData[UrlParam.OUTLINE_COLOR]).toBe("ff00ff");
      expect(serializedData[UrlParam.OPEN_TAB]).toBe(TabType.SETTINGS);
    });
  });

  describe("loadConfigSliceFromParams", () => {
    it("loads basic config settings", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.SHOW_PATH, "0");
      params.set(UrlParam.SHOW_SCALEBAR, "0");
      params.set(UrlParam.SHOW_TIMESTAMP, "0");
      params.set(UrlParam.FILTERED_COLOR, "ff0000");
      params.set(UrlParam.FILTERED_MODE, DrawMode.USE_COLOR.toString());
      params.set(UrlParam.OUTLIER_COLOR, "00ff00");
      params.set(UrlParam.OUTLIER_MODE, DrawMode.USE_COLOR.toString());
      params.set(UrlParam.OUTLINE_COLOR, "0000ff");
      params.set(UrlParam.OPEN_TAB, TabType.SCATTER_PLOT);
      act(() => {
        loadConfigSliceFromParams(result.current, params);
      });
      expect(result.current.showTrackPath).toBe(false);
      expect(result.current.showScaleBar).toBe(false);
      expect(result.current.showTimestamp).toBe(false);
      expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0xff0000), mode: DrawMode.USE_COLOR });
      expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0x00ff00), mode: DrawMode.USE_COLOR });
      expect(result.current.outlineColor).toEqual(new Color(0x0000ff));
      expect(result.current.openTab).toBe(TabType.SCATTER_PLOT);

      params.set(UrlParam.SHOW_PATH, "1");
      params.set(UrlParam.SHOW_SCALEBAR, "1");
      params.set(UrlParam.SHOW_TIMESTAMP, "1");
      params.set(UrlParam.FILTERED_COLOR, "ffff00");
      params.set(UrlParam.FILTERED_MODE, DrawMode.HIDE.toString());
      params.set(UrlParam.OUTLIER_COLOR, "00ffff");
      params.set(UrlParam.OUTLIER_MODE, DrawMode.HIDE.toString());
      params.set(UrlParam.OUTLINE_COLOR, "ff00ff");
      params.set(UrlParam.OPEN_TAB, TabType.SETTINGS);
      act(() => {
        loadConfigSliceFromParams(result.current, params);
      });
      expect(result.current.showTrackPath).toBe(true);
      expect(result.current.showScaleBar).toBe(true);
      expect(result.current.showTimestamp).toBe(true);
      expect(result.current.outOfRangeDrawSettings).toEqual({ color: new Color(0xffff00), mode: DrawMode.HIDE });
      expect(result.current.outlierDrawSettings).toEqual({ color: new Color(0x00ffff), mode: DrawMode.HIDE });
      expect(result.current.outlineColor).toEqual(new Color(0xff00ff));
      expect(result.current.openTab).toBe(TabType.SETTINGS);
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
