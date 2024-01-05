import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "vitest-canvas-mock";

// Fix for the following error:
// `TypeError: The "obj" argument must be an instance of Blob. Received an instance of Blob`
// https://github.com/vitest-dev/vitest/issues/3985
window.URL.createObjectURL = vi.fn();

// Fix for the following error:
// `Error: Not implemented: window.computedStyle(elt, pseudoElt)`
// https://github.com/nickcolley/jest-axe/issues/147 (not the source of error but a relevant workaround)
const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);

afterEach(() => {
  cleanup();
});
