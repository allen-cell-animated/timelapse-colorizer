import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";

export const useBackdropShortcuts = (): void => {
  const dataset = useViewerStateStore((state) => state.dataset);

  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);

  const backdropData = useMemo(() => dataset?.getBackdropData(), [dataset]);
  const backdropKeys = Array.from(backdropData?.keys() ?? []);
  const backdropIndex = backdropKey !== null ? backdropKeys.indexOf(backdropKey) : -1;

  const cycleBackdrop = useCallback(
    (step: number) => {
      const nextBackdropKey = backdropKeys[(backdropIndex + step + backdropKeys.length) % backdropKeys.length];
      setBackdropKey(nextBackdropKey);
      setBackdropVisible(true);
    },
    [backdropKeys, backdropIndex, setBackdropKey, setBackdropVisible]
  );

  const selectBackdrop = useCallback(
    (event: KeyboardEvent) => {
      const newIndex = Number.parseInt(event.key) - 1;
      if (Number.isNaN(newIndex) || newIndex >= backdropKeys.length) {
        return;
      }

      if (newIndex === backdropIndex) {
        setBackdropVisible(!backdropVisible);
      } else {
        setBackdropKey(backdropKeys[newIndex]);
        setBackdropVisible(true);
      }
    },
    [backdropKeys, backdropIndex, setBackdropKey, setBackdropVisible]
  );

  useHotkeys(SHORTCUT_KEYS.backdrops.cycleForward.keycode, () => {
    cycleBackdrop(1);
  });
  useHotkeys(SHORTCUT_KEYS.backdrops.cycleBackward.keycode, () => {
    cycleBackdrop(-1);
  });
  useHotkeys(SHORTCUT_KEYS.backdrops.showChannel.keycode, selectBackdrop);
};
