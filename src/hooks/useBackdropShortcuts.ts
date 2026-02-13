import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";

export const useBackdropShortcuts = (): void => {
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  //   const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const dataset = useViewerStateStore((state) => state.dataset);

  const stepBackdrop = useCallback(
    (step: number) => {
      const backdropData = dataset?.getBackdropData();
      if (!backdropData || backdropKey === null) {
        return;
      }
      const backdropKeys = Array.from(backdropData.keys());
      const backdropIndex = backdropKeys.indexOf(backdropKey);
      const nextBackdropKey = backdropKeys[(backdropIndex + step + backdropKeys.length) % backdropKeys.length];
      setBackdropKey(nextBackdropKey);
      setBackdropVisible(true);
    },
    [backdropKey, dataset, setBackdropKey, setBackdropVisible]
  );

  useHotkeys(SHORTCUT_KEYS.backdrops.cycleForward.keycode, () => {
    stepBackdrop(1);
  });
  useHotkeys(SHORTCUT_KEYS.backdrops.cycleBackward.keycode, () => {
    stepBackdrop(-1);
  });
};
