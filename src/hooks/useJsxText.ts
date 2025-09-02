import { ReactNode, useCallback, useState } from "react";

import { renderStringArrayAsJsx } from "../utils/formatting";

/**
 * Convenience state hook for formatting text as JSX, using
 * `renderStringArrayAsJsx`. Handles formatting for Markdown-style lists and
 * paragraph elements.
 */
export function useJsxText(initialValue?: ReactNode): [ReactNode, (newErrorText: ReactNode) => void] {
  const [text, _setText] = useState<ReactNode>(initialValue ?? null);

  const setText = useCallback((newErrorText: ReactNode) => {
    if (typeof newErrorText === "string" && newErrorText !== "") {
      const splitText = newErrorText.split("\n");
      _setText(renderStringArrayAsJsx(splitText));
    } else {
      _setText(newErrorText);
    }
  }, []);

  return [text, setText];
}
