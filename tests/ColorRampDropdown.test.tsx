import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorRampDropdown from "../src/components/ColorRampDropdown";
import React from "react";
import { ColorRamp } from "../src/colorizer";
import { ANY_ERROR } from "./test_utils";
import { RawColorData } from "../src/constants";

describe("ColorRampDropdown", () => {
  const colorRamps: [string, RawColorData][] = [
    ["map1", { key: "map1", name: "Map 1", colorStops: ["#ffffff", "#000000"] }],
    ["map2", { key: "map2", name: "Map 2", colorStops: ["#ffffff", "#000000"] }],
    ["map3", { key: "map3", name: "Map 3", colorStops: ["#ffffff", "#000000"] }],
  ];
  const customColorRamps = new Map(
    colorRamps.map(([key, data]) => {
      return [key, { ...data, colorRamp: new ColorRamp(data.colorStops) }];
    })
  );

  it("can render with correct label", async () => {
    render(
      <ColorRampDropdown selectedRamp={"map1"} colorRamps={customColorRamps} onChangeRamp={(_value: string) => {}} />
    );
    const element = screen.getByText(/Color map/);
    expect(element).toBeInTheDocument();
  });

  it("calls the onChange callback when a selection is made", () => {
    const callback = (_key: string): void => {
      // do nothing
    };
    const mockCallback = vi.fn(callback);

    render(<ColorRampDropdown selectedRamp={"map1"} colorRamps={customColorRamps} onChangeRamp={mockCallback} />);
    const elements = screen.getAllByRole("button");

    // Expect maps to be ordered according to the color ramp, and skip the first button which is the main selector.
    for (let i = 1; i < elements.length - 1; i++) {
      // Ignore the last button, which is for reversing
      const buttonElement = elements[i];
      fireEvent.click(buttonElement);
    }

    // Should be called three times, in order, one time for each element.
    expect(mockCallback.mock.calls.length).to.equal(3);
    expect(mockCallback.mock.calls).deep.equals([
      ["map1", false],
      ["map2", false],
      ["map3", false],
    ]);
  });

  it("throws an error when the selected key is invalid", () => {
    console.error = vi.fn(); // hide error output

    expect(() =>
      render(
        <ColorRampDropdown
          selectedRamp={"bad-key"}
          colorRamps={customColorRamps}
          onChangeRamp={(_value: string) => {}}
        />
      )
    ).toThrow(ANY_ERROR);
  });
});
