import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderStringArrayAsJsx } from "../src/utils/formatting";

function doElementsHaveSharedParent(elements: HTMLElement[]): boolean {
  if (elements.length === 0) {
    return false;
  }
  const parent = elements[0].parentElement;
  if (!parent) {
    return false;
  }
  return elements.every((element) => element.parentElement === parent);
}

describe("renderStringArrayAsJsx", () => {
  it("handles empty array", () => {
    const elements = renderStringArrayAsJsx([]);
    expect(elements).toBeUndefined();
  });

  it("handles undefined", () => {
    const elements = renderStringArrayAsJsx(undefined);
    expect(elements).toBeUndefined();
  });

  it("handles single text element", () => {
    const elements = renderStringArrayAsJsx("hi");
    expect(elements).not.toBeUndefined();
    const renderedElements = render(elements!);
    expect(renderedElements.getByText("hi")).toBeInTheDocument();
    expect(renderedElements.getByText("hi").nodeName).toBe("P");
  });

  it("handles multiple text elements", () => {
    const elements = renderStringArrayAsJsx(["1", "2", "3"]);
    expect(elements).not.toBeUndefined();
    const renderedElements = render(elements!);
    expect(renderedElements.getByText("1").nodeName).toBe("P");
    expect(renderedElements.getByText("2").nodeName).toBe("P");
    expect(renderedElements.getByText("3").nodeName).toBe("P");
  });

  it("handles list elements", () => {
    const elements = renderStringArrayAsJsx(["- 1", "- 2", "- 3"]);
    expect(elements).not.toBeUndefined();
    const renderedElements = render(elements!);
    const listItems = renderedElements.getAllByRole("listitem");
    expect(listItems.length).toBe(3);
    // Elements should all be grouped under one parent
    expect(listItems[0].parentElement!.nodeName).toBe("UL");
    expect(doElementsHaveSharedParent(listItems)).toBe(true);
  });

  it("handles mixed list and text elements", () => {
    const elements = renderStringArrayAsJsx(["- 1", "- 2", "- 3", "a", "b", "- 4", "- 5"]);
    expect(elements).not.toBeUndefined();
    const renderedElements = render(elements!);

    expect(renderedElements.getByText("a").nodeName).toBe("P");
    expect(renderedElements.getByText("b").nodeName).toBe("P");

    const listItems = renderedElements.getAllByRole("listitem");
    expect(listItems.length).toBe(5);
    // Should have two different unordered lists
    expect(doElementsHaveSharedParent(listItems)).toBe(false);
    expect(listItems[0].parentElement!.nodeName).toBe("UL");
    expect(doElementsHaveSharedParent([listItems[0], listItems[1], listItems[2]])).toBe(true);
    expect(listItems[3].parentElement!.nodeName).toBe("UL");
    expect(doElementsHaveSharedParent([listItems[3], listItems[4]])).toBe(true);
  });
});
