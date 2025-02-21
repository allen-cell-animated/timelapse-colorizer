import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dataset } from "../../../src/colorizer";

import { useViewerStateStore } from "../../../src/colorizer/state/ViewerState";

describe("useViewerStateStore: DatasetSlice", () => {
  it("initializes backdrop keys to default when dataset is set", () => {
    const { result } = renderHook(() => useViewerStateStore());
    const DEFAULT_BACKDROP_KEY = "test";

    // TODO: This will likely need to be an actual dataset object at some point
    // as changing the dataset has more side effects.
    let mockDataset = {
      getDefaultBackdropKey: () => DEFAULT_BACKDROP_KEY,
      hasBackdrop: (key: string) => key === DEFAULT_BACKDROP_KEY,
    } as unknown as Dataset;
    act(() => {
      result.current.setDataset("some-key", mockDataset);
    });

    expect(result.current.dataset).toBe(mockDataset);
    expect(result.current.backdropKey).toBe(DEFAULT_BACKDROP_KEY);

    // Change dataset to one without default backdrop, backdropKey should
    // be reset to null.
    mockDataset = {
      getDefaultBackdropKey: () => null,
      hasBackdrop: () => false,
    } as unknown as Dataset;
    act(() => {
      result.current.setDataset("some-other-key", mockDataset);
    });
    expect(result.current.dataset).toBe(mockDataset);
    expect(result.current.backdropKey).toBeNull();
  });
});
