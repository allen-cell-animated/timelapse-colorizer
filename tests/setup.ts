import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { generateUUID } from "three/src/math/MathUtils";
import { afterEach, vi } from "vitest";
import "vitest-canvas-mock";

// Fix for the following error:
// `TypeError: The "obj" argument must be an instance of Blob. Received an instance of Blob`
// https://github.com/vitest-dev/vitest/issues/3985
window.URL.createObjectURL = (_blob: Blob): string => {
  return "http://mocked-created-url/" + generateUUID();
};

// Fix for the following error:
// `Error: Not implemented: window.computedStyle(elt, pseudoElt)`
// https://github.com/nickcolley/jest-axe/issues/147 (not the source of error but a relevant workaround)
const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);

// Fix error where File and createObjectUrl do not exist:

// Mocks the `zustand` package so stores can be reset after each test run
vi.mock("zustand");

afterEach(() => {
  cleanup();
});
