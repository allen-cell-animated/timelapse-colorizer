import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import type { Dataset } from "src/colorizer";
import type { ManifestFile } from "src/colorizer/utils/dataset_utils";
import { useViewerStateStore } from "src/state";
import { MOCK_COLLECTION, MOCK_DATASET_MANIFEST } from "tests/constants";
import { makeMockDataset } from "tests/utils";

import { setDatasetAsync } from "./utils";

const makeDatasetWithNChannels = async (n: number): Promise<Dataset> => {
  const originalManifest = MOCK_DATASET_MANIFEST as ManifestFile;
  const newManifest = {
    ...originalManifest,
    frames3d: {
      ...originalManifest.frames3d,
      backdrops: originalManifest.frames3d?.backdrops!.slice(0, n),
    },
  };
  return await makeMockDataset(newManifest);
};

describe("ChannelSlice", () => {
  describe("state subscribers", () => {
    describe("resets channel settings when dataset changes", () => {
      it("defaults to white for single-channel datasets", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset = await makeDatasetWithNChannels(1);
        await setDatasetAsync(result, dataset);
        const channelSettings = result.current.channelSettings;
        expect(channelSettings.length).toBe(1);
        expect(channelSettings[0].color.getHex()).toBe(0xffffff);
      });

      it("defaults to magenta and green for two-channel datasets", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset = await makeDatasetWithNChannels(2);
        await setDatasetAsync(result, dataset);
        const channelSettings = result.current.channelSettings;
        expect(channelSettings.length).toBe(2);
        expect(channelSettings[0].color.getHex()).toBe(0xff00ff);
        expect(channelSettings[1].color.getHex()).toBe(0x00ff00);
      });

      it("defaults to magenta, cyan, and yellow for three-channel datasets", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset = await makeDatasetWithNChannels(3);
        await setDatasetAsync(result, dataset);
        const channelSettings = result.current.channelSettings;
        expect(channelSettings.length).toBe(3);
        expect(channelSettings[0].color.getHex()).toBe(0xff00ff);
        expect(channelSettings[1].color.getHex()).toBe(0x00ffff);
        expect(channelSettings[2].color.getHex()).toBe(0xffff00);
      });

      it("updates the number of channels when the dataset updates", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset1 = await makeDatasetWithNChannels(2);
        await setDatasetAsync(result, dataset1);
        expect(result.current.channelSettings.length).toBe(2);
        const dataset2 = await makeDatasetWithNChannels(0);
        await setDatasetAsync(result, dataset2);
        expect(result.current.channelSettings.length).toBe(0);
      });

      it("preserves existing channel settings when the dataset updates", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset1 = await makeDatasetWithNChannels(2);
        await setDatasetAsync(result, dataset1);
        expect(result.current.channelSettings.length).toBe(2);
        act(() => {
          useViewerStateStore.getState().updateChannelSettings(0, {
            visible: false,
          });
        });
        const dataset2 = await makeDatasetWithNChannels(0);
        await setDatasetAsync(result, dataset2);
        expect(result.current.channelSettings.length).toBe(0);
      });
    });

    it("resets channel settings when collection changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const dataset = await makeDatasetWithNChannels(1);
      await setDatasetAsync(result, dataset);

      const initialChannelSettings = [...result.current.channelSettings];
      expect(initialChannelSettings.length).toBe(1);
      act(() => {
        useViewerStateStore.getState().updateChannelSettings(0, {
          visible: false,
          color: new Color("#888888"),
          opacity: 0.5,
        });
      });
      expect(result.current.channelSettings).not.toEqual(initialChannelSettings);
      expect(result.current.channelSettings[0].visible).toBe(false);
      expect(result.current.channelSettings[0].color.getHexString()).toBe("888888");
      expect(result.current.channelSettings[0].opacity).toBe(0.5);

      act(() => {
        useViewerStateStore.getState().setCollection(MOCK_COLLECTION);
      });
      expect(result.current.channelSettings).toEqual(initialChannelSettings);
    });
  });
});
