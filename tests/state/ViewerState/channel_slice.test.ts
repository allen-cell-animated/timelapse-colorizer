import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import type { ChannelSetting, Dataset } from "src/colorizer";
import type { ManifestFile } from "src/colorizer/utils/dataset_utils";
import { useViewerStateStore } from "src/state";
import { loadChannelSliceFromParams, serializeChannelSlice } from "src/state/slices";
import { MOCK_COLLECTION, MOCK_DATASET_MANIFEST } from "tests/constants";
import { makeMockDataset } from "tests/utils";

import { setDatasetAsync } from "./utils";

const makeDatasetWithNChannels = async (n: number): Promise<Dataset> => {
  const originalManifest = MOCK_DATASET_MANIFEST as ManifestFile;
  const originalBackdrops = originalManifest.frames3d?.backdrops!;

  let backdrops = originalBackdrops;
  if (n > originalBackdrops.length) {
    // Repeat array
    const numRepeats = Math.ceil(n / originalBackdrops.length);
    backdrops = Array(numRepeats).fill(originalBackdrops).flat();
  }
  backdrops = backdrops.slice(0, n);

  const newManifest = {
    ...originalManifest,
    frames3d: {
      ...originalManifest.frames3d,
      backdrops,
    },
  };
  return await makeMockDataset(newManifest);
};

const deepCopyChannelSettings = (settings: ChannelSetting[]): ChannelSetting[] => {
  return settings.map((s) => ({
    ...s,
    color: s.color.clone(),
  }));
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

      const initialChannelSettings = deepCopyChannelSettings(result.current.channelSettings);
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

  describe("updateChannelSettings", () => {
    it("can update channels", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const dataset = await makeDatasetWithNChannels(1);
      await setDatasetAsync(result, dataset);

      expect(result.current.channelSettings.length).toBe(1);
      act(() => {
        useViewerStateStore.getState().updateChannelSettings(0, {
          visible: true,
          min: 5,
          max: 6,
          color: new Color("#123456"),
        });
      });
      let channel = result.current.channelSettings[0];
      expect(channel.color.getHexString()).to.equal("123456");
      expect(channel.min).to.equal(5);
      expect(channel.max).to.equal(6);
      expect(channel.visible).to.equal(true);

      act(() => {
        useViewerStateStore.getState().updateChannelSettings(0, {
          visible: false,
          min: 100,
          max: 150,
          color: new Color("#ff83ff"),
        });
      });
      channel = result.current.channelSettings[0];
      expect(channel.color.getHexString()).to.equal("ff83ff");
      expect(channel.min).to.equal(100);
      expect(channel.max).to.equal(150);
      expect(channel.visible).to.equal(false);
    });

    it("ignores channels that are out of range", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const dataset = await makeDatasetWithNChannels(2);
      await setDatasetAsync(result, dataset);

      expect(result.current.channelSettings.length).toBe(2);
      const initialSettings = deepCopyChannelSettings(result.current.channelSettings);

      act(() => {
        useViewerStateStore.getState().updateChannelSettings(3, {
          color: new Color("#123456"),
        });
      });
      expect(result.current.channelSettings).to.deep.equal(initialSettings);
    });
  });

  describe("serialization", () => {
    const CHANNEL_SETTINGS = [
      { visible: true, color: new Color("#55aa99"), opacity: 0x44 / 0xff, min: 10, max: 15, dataMin: 0, dataMax: 30 },
      {
        visible: false,
        color: new Color("#009332"),
        opacity: 0xfa / 0xff,
        min: 50,
        max: 75,
        dataMin: 25,
        dataMax: 100,
      },
    ];
    const SERIALIZED_CHANNEL_SETTINGS = {
      c0: "ven:1,col:55aa9944,rmp:10:15,rng:0:30",
      c1: "ven:0,col:009332fa,rmp:50:75,rng:25:100",
    };

    describe("serializeChannelSlice", () => {
      it("serializes channel data", () => {
        const serialized = serializeChannelSlice({ channelSettings: CHANNEL_SETTINGS });
        expect(serialized).to.deep.equal(SERIALIZED_CHANNEL_SETTINGS);
      });
    });

    describe("loadChannelSliceFromParams", () => {
      it("deserializes channel data", async () => {
        const { result } = renderHook(() => useViewerStateStore());
        const dataset = await makeDatasetWithNChannels(2);
        await setDatasetAsync(result, dataset);

        const searchParams = new URLSearchParams(SERIALIZED_CHANNEL_SETTINGS);
        act(() => {
          loadChannelSliceFromParams(result.current, searchParams);
        });

        expect(result.current.channelSettings).to.deep.equal(CHANNEL_SETTINGS);
      });
    });

    function getRandom8BitNumber(): number {
      return Math.round(Math.random() * 255);
    }

    function getRandomSerializableNumber(): number {
      // Must have no more than 3 digits of precision
      return Math.round(Math.random() * 200_000 - 100_000) / 1000;
    }

    function makeRandomChannelSettings(): ChannelSetting {
      const r = getRandom8BitNumber();
      const g = getRandom8BitNumber();
      const b = getRandom8BitNumber();
      return {
        visible: Math.random() > 0.5,
        color: new Color(
          "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0")
        ),
        opacity: getRandom8BitNumber() / 255,
        min: getRandomSerializableNumber(),
        max: getRandomSerializableNumber(),
        dataMin: getRandomSerializableNumber(),
        dataMax: getRandomSerializableNumber(),
      };
    }

    it("can serialize and deserialize many channels", async () => {
      const numChannels = 100;
      const { result } = renderHook(() => useViewerStateStore());
      const dataset = await makeDatasetWithNChannels(numChannels);
      await setDatasetAsync(result, dataset);

      const channels = new Array(numChannels).fill(null).map(() => makeRandomChannelSettings());
      const serialized = serializeChannelSlice({ channelSettings: channels });
      act(() => {
        loadChannelSliceFromParams(result.current, new URLSearchParams(serialized as Record<string, string>));
      });

      expect(result.current.channelSettings).to.deep.equal(channels);
    });
  });
});
