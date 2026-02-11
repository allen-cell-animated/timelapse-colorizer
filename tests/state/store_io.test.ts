/* eslint @typescript-eslint/naming-convention: 0 */
// ^ Allow dash-case for URL params
import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import {
  DrawMode,
  type DrawSettings,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
  PlotRangeType,
  TabType,
  ThresholdType,
  TrackPathColorMode,
  VECTOR_KEY_MOTION_DELTA,
  VectorTooltipMode,
} from "src/colorizer";
import type { UrlParam } from "src/colorizer/utils/url_utils";
import { useViewerStateStore } from "src/state";
import type { ViewerStoreSerializableState } from "src/state/slices";
import type { SerializedStoreData } from "src/state/types";
import {
  loadInitialViewerStateFromParams,
  loadViewerStateFromParams,
  serializedDataToUrl,
  serializeViewerParams,
} from "src/state/utils/store_io";
import {
  MOCK_COLLECTION,
  MOCK_COLLECTION_PATH,
  MOCK_DATASET,
  MOCK_DATASET_DEFAULT_TRACK,
  MOCK_DATASET_KEY,
  MockBackdropKeys,
  MockFeatureKeys,
} from "tests/constants";
import { sleep } from "tests/utils";

import { compareRecord, setDatasetAsync } from "./ViewerState/utils";

const COLOR_RAMP_KEY = Array.from(KNOWN_COLOR_RAMPS.keys())[3];
const CATEGORICAL_PALETTE_KEY = Array.from(KNOWN_CATEGORICAL_PALETTES.keys())[2];
const CATEGORICAL_PALETTE = KNOWN_CATEGORICAL_PALETTES.get(CATEGORICAL_PALETTE_KEY)!.colors;

const EXAMPLE_STORE: ViewerStoreSerializableState = {
  collection: MOCK_COLLECTION,
  sourceZipName: null,
  datasetKey: MOCK_DATASET_KEY,
  featureKey: MockFeatureKeys.FEATURE1,
  tracks: new Map([[0, MOCK_DATASET_DEFAULT_TRACK]]),
  currentFrame: 2,
  thresholds: [
    { featureKey: "f1", unit: "m", type: ThresholdType.NUMERIC, min: 0, max: 0 },
    { featureKey: "f2", unit: "um", type: ThresholdType.NUMERIC, min: NaN, max: NaN },
    { featureKey: "f3", unit: "km", type: ThresholdType.NUMERIC, min: 0, max: 1 },
    { featureKey: "f4", unit: "mm", type: ThresholdType.NUMERIC, min: 0.501, max: 1000.485 },
    {
      featureKey: "f5",
      unit: "",
      type: ThresholdType.CATEGORICAL,
      enabledCategories: [true, true, true, true, true, true, true, true, true, true, true, true],
    },
    {
      featureKey: "f6",
      unit: "",
      type: ThresholdType.CATEGORICAL,
      enabledCategories: [true, false, false, false, true, false, false, false, false, false, false, false],
    },
  ],
  colorRampRange: [21.433, 89.4],
  colorRampKey: COLOR_RAMP_KEY,
  isColorRampReversed: true,
  categoricalPaletteKey: CATEGORICAL_PALETTE_KEY,
  categoricalPalette: CATEGORICAL_PALETTE,
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: false,
  keepColorRampRange: true,
  backdropVisible: true,
  backdropBrightness: 75,
  backdropSaturation: 50,
  objectOpacity: 25,
  openTab: TabType.FILTERS,
  outOfRangeDrawSettings: { mode: DrawMode.HIDE, color: new Color("#ff0000") } as DrawSettings,
  outlierDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color("#00ff00") } as DrawSettings,
  outlineColor: new Color("#0000ff"),
  edgeColor: new Color("#8090a0"),
  edgeColorAlpha: 176 / 255, // 0xb0
  edgeMode: DrawMode.USE_COLOR,
  interpolate3d: true,
  trackPathColor: new Color("#ff0000"),
  trackPathWidthPx: 1.5,
  trackPathColorRampKey: "esri-blue_red_8",
  trackPathIsColorRampReversed: true,
  trackPathColorMode: TrackPathColorMode.USE_CUSTOM_COLOR,
  showTrackPathBreaks: true,
  trackPathFutureSteps: 25,
  trackPathPastSteps: 10,
  showAllTrackPathFutureSteps: true,
  showAllTrackPathPastSteps: false,
  persistTrackPathWhenOutOfRange: false,
  vectorVisible: true,
  vectorKey: VECTOR_KEY_MOTION_DELTA,
  vectorMotionTimeIntervals: 11,
  vectorColor: new Color("#ff00ff"),
  vectorScaleFactor: 5,
  vectorTooltipMode: VectorTooltipMode.COMPONENTS,
  vectorScaleThicknessByMagnitude: true,
  vectorThickness: 4.5,
  backdropKey: MockBackdropKeys.BACKDROP2,
  scatterXAxis: MockFeatureKeys.FEATURE3,
  scatterYAxis: MockFeatureKeys.FEATURE2,
  scatterRangeType: PlotRangeType.ALL_TIME,
  channelSettings: [
    { visible: true, color: new Color("#ff0000"), opacity: 1, min: 0, max: 1, dataMin: -5, dataMax: 5 },
    { visible: false, color: new Color("#00ff00"), opacity: 0, min: 0.3, max: 4.2, dataMin: 0, dataMax: 1 },
    {
      visible: true,
      color: new Color("#0000ff"),
      opacity: 4 / 255,
      min: 3500,
      max: 64231,
      dataMin: 0,
      dataMax: 65535,
    },
  ],
};

// Omit key "palette" because it is overridden by key "palette-key"
type ExpectedParamType = Required<Omit<SerializedStoreData, UrlParam.PALETTE | UrlParam.SOURCE_ZIP>>;
const EXAMPLE_STORE_EXPECTED_PARAMS: ExpectedParamType = {
  collection: MOCK_COLLECTION_PATH,
  dataset: MOCK_DATASET_KEY,
  feature: MockFeatureKeys.FEATURE1,
  track: MOCK_DATASET_DEFAULT_TRACK.trackId.toString(),
  t: "2",
  filters: "f1:m:0:0,f2:um:NaN:NaN,f3:km:0:1,f4:mm:0.501:1000.485,f5::fff,f6::11",
  range: "21.433,89.400",
  color: COLOR_RAMP_KEY + "!",
  "keep-range": "1",
  "palette-key": CATEGORICAL_PALETTE_KEY,
  path: "1",
  scalebar: "1",
  timestamp: "0",
  bg: "1",
  "bg-brightness": "75",
  "bg-sat": "50",
  "fg-alpha": "25",
  tab: TabType.FILTERS,
  "filter-color": "ff0000",
  "filter-mode": DrawMode.HIDE.toString(),
  "outlier-color": "00ff00",
  "outlier-mode": DrawMode.USE_COLOR.toString(),
  "outline-color": "0000ff",
  "edge-color": "8090a0b0",
  edge: DrawMode.USE_COLOR.toString(),
  interpolate: "1",
  "path-color": "ff0000",
  "path-width": "1.500",
  "path-ramp": "esri-blue_red_8!",
  "path-mode": TrackPathColorMode.USE_CUSTOM_COLOR.toString(),
  "path-breaks": "1",
  "path-steps": "10,25!",
  "path-persist": "0",
  vc: "1",
  "vc-key": VECTOR_KEY_MOTION_DELTA,
  "vc-color": "ff00ff",
  "vc-scale": "5",
  "vc-tooltip": VectorTooltipMode.COMPONENTS,
  "vc-time-int": "11",
  "vc-thickness": "4.500",
  "vc-thickness-scaling": "1",
  "bg-key": MockBackdropKeys.BACKDROP2,
  "scatter-x": MockFeatureKeys.FEATURE3,
  "scatter-y": MockFeatureKeys.FEATURE2,
  "scatter-range": "all",
  c0: "ven:1,col:ff0000ff,rmp:0:1,rng:-5:5",
  c1: "ven:0,col:00ff0000,rmp:0.300:4.200,rng:0:1",
  c2: "ven:1,col:0000ff04,rmp:3500:64231,rng:0:65535",
};

const EXAMPLE_STORE_EXPECTED_QUERY_STRING =
  "collection=https%3A%2F%2Fsome-url.com%2Fcollection.json&dataset=some-dataset" +
  "&feature=feature1&bg-key=backdrop2&track=0&t=2&color=matplotlib-inferno%21&keep-range=1&range=21.433%2C89.400" +
  "&palette-key=matplotlib_paired&filters=f1%3Am%3A0%3A0%2Cf2%3Aum%3ANaN%3ANaN%2Cf3%3Akm%3A0%3A1%2Cf4%3Amm%3A0.501%3A1000.485%2Cf5%3A%3Afff%2Cf6%3A%3A11" +
  "&path=1&path-color=ff0000&path-width=1.500&path-ramp=esri-blue_red_8%21&path-mode=1&path-breaks=1&path-steps=10%2C25%21&path-persist=0&scalebar=1&timestamp=0&filter-color=ff0000&filter-mode=0&outlier-color=00ff00&outlier-mode=1&outline-color=0000ff" +
  "&edge=1&edge-color=8090a0b0" +
  "&tab=filters&interpolate=1&scatter-x=feature3&scatter-y=feature2&scatter-range=all" +
  "&bg=1&bg-brightness=75&bg-sat=50&fg-alpha=25" +
  "&vc=1&vc-key=_motion_&vc-color=ff00ff&vc-scale=5&vc-thickness-scaling=1&vc-thickness=4.500&vc-tooltip=c&vc-time-int=11" +
  "&c0=ven%3A1%2Ccol%3Aff0000ff%2Crmp%3A0%3A1%2Crng%3A-5%3A5" +
  "&c1=ven%3A0%2Ccol%3A00ff0000%2Crmp%3A0.300%3A4.200%2Crng%3A0%3A1" +
  "&c2=ven%3A1%2Ccol%3A0000ff04%2Crmp%3A3500%3A64231%2Crng%3A0%3A65535";
describe("serializeViewerState", () => {
  it("handles empty state", () => {
    const state = {};
    expect(serializeViewerParams(state)).toEqual({});
  });
});

describe("serializeViewerParams", () => {
  it("handles empty state", () => {
    const params = {};
    expect(serializedDataToUrl(serializeViewerParams(params))).toEqual("");
  });

  it("allows collection and dataset URLs to be provided directly", () => {
    const params = {
      collectionParam: "https://some-url.com/collection.json", // https%3A%2F%2Fsome-url.com%2Fcollection.json
      // hello world in mandarin
      datasetParam: "你好世界", // %E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C
    };
    const expectedQueryString =
      "collection=https%3A%2F%2Fsome-url.com%2Fcollection.json" + "&dataset=%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C";
    expect(serializedDataToUrl(serializeViewerParams(params))).toEqual(expectedQueryString);
  });

  it("serializes state", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setCollection(MOCK_COLLECTION);
    });
    await setDatasetAsync(result, MOCK_DATASET);
    act(() => {
      useViewerStateStore.setState(EXAMPLE_STORE);
    });
    const serializedParams = serializeViewerParams(useViewerStateStore.getState());
    expect(serializedParams).toEqual(EXAMPLE_STORE_EXPECTED_PARAMS);
    expect(serializedDataToUrl(serializedParams)).toEqual(EXAMPLE_STORE_EXPECTED_QUERY_STRING);
  });
});

describe("loadViewerStateFromParams", () => {
  it("handles empty params", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    const params = new URLSearchParams();
    await setDatasetAsync(result, MOCK_DATASET);
    const initialState = useViewerStateStore.getState();
    act(() => {
      loadViewerStateFromParams(useViewerStateStore, params);
    });
    expect(useViewerStateStore.getState()).toEqual(initialState);
  });

  it("loads state", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    const params = new URLSearchParams(serializedDataToUrl(EXAMPLE_STORE_EXPECTED_PARAMS));
    act(() => {
      result.current.setCollection(MOCK_COLLECTION);
    });
    await setDatasetAsync(result, MOCK_DATASET);
    await act(async () => {
      loadInitialViewerStateFromParams(useViewerStateStore, params);
      loadViewerStateFromParams(useViewerStateStore, params);
      // Fixup: Wait for frame to load fully so `currentFrame` value is correct
      await sleep(10);
    });
    compareRecord(useViewerStateStore.getState(), EXAMPLE_STORE);
  });
});
