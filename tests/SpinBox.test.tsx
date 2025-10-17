import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { assert, describe, expect, it, vi } from "vitest";

import SpinBox from "src/components/SpinBox";

describe("SpinBox", () => {
  it("calls onChange when blurred", async () => {
    const onChange = (_value: number): void => {};
    const mockOnChange = vi.fn(onChange);

    render(<SpinBox value={1} onChange={mockOnChange}></SpinBox>);

    const element = screen.queryByTestId("spinbox-input");
    assert(element);
    fireEvent.focus(element);
    fireEvent.input(element, { target: { value: 1111 } });
    fireEvent.blur(element);
  });

  it("calls onChange when Enter is pressed", () => {
    const onChange = (_value: number): void => {};
    const mockOnChange = vi.fn(onChange);
    render(<SpinBox value={1} onChange={mockOnChange}></SpinBox>);
    const element = screen.queryByTestId("spinbox-input");
    assert(element);

    fireEvent.focus(element);
    fireEvent.input(element, { target: { value: 2222 } });
    fireEvent.keyDown(element, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockOnChange.mock.calls.length).to.equal(1);
    expect(mockOnChange.mock.calls).deep.equals([[2222]]);
  });

  it("enforces min and max", () => {
    const onChange = (_value: number): void => {};
    const mockOnChange = vi.fn(onChange);
    const { rerender } = render(<SpinBox value={1} min={0} max={10} onChange={mockOnChange} />);
    const element = screen.queryByTestId("spinbox-input") as HTMLInputElement;
    assert(element);

    // Should allow erroneous values until Enter is pressed/focus exits
    fireEvent.input(element, { target: { value: 100 } });
    expect(element.valueAsNumber).to.equal(100);

    fireEvent.keyDown(element, { key: "Enter", code: "Enter", charCode: 13 });
    expect(mockOnChange.mock.calls.length).to.equal(1);
    expect(mockOnChange.mock.calls).deep.equals([[10]]);

    // Re render with new value
    rerender(<SpinBox value={10} min={0} max={10} onChange={mockOnChange} />);
    expect(element.valueAsNumber).to.equal(10);

    // Repeat with min
    fireEvent.input(element, { target: { value: -10 } });
    expect(element.valueAsNumber).to.equal(-10);

    fireEvent.keyDown(element, { key: "Enter", code: "Enter", charCode: 13 });
    expect(mockOnChange.mock.calls.length).to.equal(2);
    expect(mockOnChange.mock.calls).deep.equals([[10], [0]]);

    rerender(<SpinBox value={0} min={0} max={10} onChange={mockOnChange} />);
    expect(element.valueAsNumber).to.equal(0);
  });
});
