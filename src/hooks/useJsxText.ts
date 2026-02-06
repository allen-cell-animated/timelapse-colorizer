import { type ReactNode, useCallback, useState } from "react";

import { renderStringArrayAsJsx } from "src/utils/formatting";

/**
 * Convenience state hook for formatting string text as JSX, using
 * `renderStringArrayAsJsx`. Handles formatting for Markdown-style lists and
 * paragraph elements.
 */
export function useJsxText(initialValue?: ReactNode): [ReactNode, (newErrorText: ReactNode) => void] {
  const [text, _setText] = useState<ReactNode>(initialValue ?? null);

  const setText = useCallback((newText: ReactNode) => {
    if (typeof newText === "string" && newText !== "") {
      const splitText = newText.split("\n");
      _setText(renderStringArrayAsJsx(splitText));
    } else {
      _setText(newText);
    }
  }, []);

  return [text, setText];
}
