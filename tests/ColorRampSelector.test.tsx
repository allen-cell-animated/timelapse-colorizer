import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorRampSelector from "../src/components/ColorRampSelector";
import React from "react";
import { ColorRamp } from "../src/colorizer";
import { ColorRepresentation } from "three";
import { ANY_ERROR } from "./test_utils";

describe("ColorRampSelector", () => {
  const colorRamps: [string, ColorRepresentation[]][] = [
    ["map1", ["#ffffff", "#000000"]],
    ["map2", ["#ffffff", "#000000"]],
    ["map3", ["#ffffff", "#000000"]],
  ];
  const customColorRamps = new Map(
    colorRamps.map(([name, gradient]) => {
      return [name, new ColorRamp(gradient)];
    })
  );

  it("can render with correct label", async () => {
    render(<ColorRampSelector selected={"map1"} colorRamps={customColorRamps} onChange={(_value: string) => {}} />);
    const element = screen.getByText(/Color Ramp/);
    expect(element).toBeInTheDocument();
  });

  it("calls the onChange callback when a selection is made", () => {
    const callback = (_key: string): void => {
      // do nothing
    };
    const mockCallback = vi.fn(callback);

    render(<ColorRampSelector selected={"map1"} colorRamps={customColorRamps} onChange={mockCallback} />);
    const elements = screen.getAllByRole("button");

    // Expect maps to be ordered according to the color ramp, and skip the first button which is the main selector.
    for (let i = 1; i < elements.length; i++) {
      const buttonElement = elements[i];
      fireEvent.click(buttonElement);
    }

    // Should be called three times, in order, one time for each element.
    expect(mockCallback.mock.calls.length).to.equal(3);
    expect(mockCallback.mock.calls).deep.equals([["map1"], ["map2"], ["map3"]]);
  });

  it("throws an error when the selected key is invalid", () => {
    console.error = vi.fn(); // hide error output

    expect(() =>
      render(<ColorRampSelector selected={"bad-key"} colorRamps={customColorRamps} onChange={(_value: string) => {}} />)
    ).toThrow(ANY_ERROR);
  });
});
