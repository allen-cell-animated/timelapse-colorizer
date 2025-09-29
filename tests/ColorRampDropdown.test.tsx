import { render, screen } from "@testing-library/react";
import React from "react";
import { Color } from "three";
import { describe, expect, it, vi } from "vitest";

import { ColorRamp, ColorRampData, ColorRampType, RawColorData } from "@/colorizer";
import ColorRampDropdown from "@/components/Dropdowns/ColorRampDropdown";

import { ANY_ERROR } from "./test_utils";

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
          label={"Color map"}
          id={"color-ramp-dropdown"}
          selectedRamp={"map1"}
          knownColorRamps={customColorRamps}
          onChangeRamp={(_value: string) => {}}
          useCategoricalPalettes={false}
          numCategories={0}
          selectedPalette={defaultPalette}
          selectedPaletteKey={null}
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
            label={"Color map"}
            id={"color-ramp-dropdown"}
            selectedRamp={"bad-key"}
            knownColorRamps={customColorRamps}
            onChangeRamp={(_value: string) => {}}
            useCategoricalPalettes={false}
            colorRampsToDisplay={["map1", "map2", "map3"]}
            categoricalPalettesToDisplay={[]}
            numCategories={0}
            selectedPalette={[]}
            selectedPaletteKey={null}
            onChangePalette={(): void => {}}
          />
        )
      ).toThrow(ANY_ERROR);
    });
  });
});
