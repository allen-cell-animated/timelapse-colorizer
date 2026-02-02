import { vi } from "vitest";

/**
 * Console spy storage for automatic cleanup in afterEach hooks.
 * This allows tests to suppress expected console output without manual cleanup.
 */
let consoleSpies: {
  warn?: ReturnType<typeof vi.spyOn>;
  error?: ReturnType<typeof vi.spyOn>;
  log?: ReturnType<typeof vi.spyOn>;
} = {};

/**
 * Suppresses console output for tests that expect error messages or warnings.
 * Console methods are automatically restored after each test via the global afterEach hook.
 *
 * @param methods - Array of console methods to suppress (e.g., ['warn', 'error'])
 *
 * @example
 * ```typescript
 * it("throws an error with expected console warnings", async () => {
 *   disableConsole(['warn']);
 *   // Test code that triggers expected warnings
 *   await expect(someFunction()).rejects.toThrow();
 * });
 * ```
 */
export function disableConsole(methods: Array<"warn" | "error" | "log"> = ["warn", "error"]): void {
  methods.forEach((method) => {
    consoleSpies[method] = vi.spyOn(console, method).mockImplementation(() => {});
  });
}

/**
 * Restores all console methods that were suppressed via disableConsole().
 * This is automatically called by the global afterEach hook in tests/setup.ts.
 *
 * @internal This function is primarily for internal use by the test setup.
 */
export function restoreConsole(): void {
  Object.values(consoleSpies).forEach((spy) => {
    spy?.mockRestore();
  });
  consoleSpies = {};
}
