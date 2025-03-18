import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { DrawMode, TabType } from "../../../src/colorizer";
import { useViewerStateStore } from "../../../src/state";

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
});
