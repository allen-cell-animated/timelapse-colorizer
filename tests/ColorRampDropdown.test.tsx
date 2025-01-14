import { render, screen } from "@testing-library/react";
import React from "react";
import { Color } from "three";
import { describe, expect, it, vi } from "vitest";

import { ColorRamp, ColorRampData, ColorRampType, RawColorData } from "../src/colorizer";
import { ANY_ERROR } from "./test_utils";

import ColorRampDropdown from "../src/components/Dropdowns/ColorRampDropdown";

describe("ColorRampDropdown", () => {
  const defaultPalette = [new Color("#000000"), new Color("#ffffff")];
  const knownRamps: [string, RawColorData][] = [
    ["map1", { key: "map1", name: "Map 1", colorStops: ["#ffffff", "#000000"] }],
    ["map2", { key: "map2", name: "Map 2", colorStops: ["#ffffff", "#000000"] }],
    ["map3", { key: "map3", name: "Map 3", colorStops: ["#ffffff", "#000000"] }],
  ];
  const customColorRamps: Map<string, ColorRampData> = new Map(
    knownRamps.map(([key, data]) => {
      return [key, { ...data, colorRamp: new ColorRamp(data.colorStops, ColorRampType.LINEAR) }];
    })
  );

  describe("Color Ramps", () => {
    it("can render with correct label", async () => {
      render(
        <ColorRampDropdown
          selectedRamp={"map1"}
          knownColorRamps={customColorRamps}
          onChangeRamp={(_value: string) => {}}
          useCategoricalPalettes={false}
          numCategories={0}
          selectedPalette={defaultPalette}
          onChangePalette={(): void => {}}
          colorRampsToDisplay={["map1", "map2", "map3"]}
          categoricalPalettesToDisplay={[]}
        />
      );
      const element = screen.getByText(/Color map/);
      expect(element).toBeInTheDocument();
    });

    it("throws an error when the selected key is invalid", () => {
      console.error = vi.fn(); // hide error output

      expect(() =>
        render(
          <ColorRampDropdown
            selectedRamp={"bad-key"}
            knownColorRamps={customColorRamps}
            onChangeRamp={(_value: string) => {}}
            useCategoricalPalettes={false}
            colorRampsToDisplay={["map1", "map2", "map3"]}
            categoricalPalettesToDisplay={[]}
            numCategories={0}
            selectedPalette={[]}
            onChangePalette={(): void => {}}
          />
        )
      ).toThrow(ANY_ERROR);
    });
  });
});
