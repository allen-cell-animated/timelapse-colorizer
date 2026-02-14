import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { SHORTCUT_KEYS } from "src/constants";
import { useViewerStateStore } from "src/state";

export const useBackdropShortcuts = (): void => {
  const dataset = useViewerStateStore((state) => state.dataset);

  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const channelSettings = useViewerStateStore((state) => state.channelSettings);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);

  const isDataset3d = dataset?.has3dFrames() ?? false;

  const backdropData = useMemo(() => dataset?.getBackdropData(), [dataset]);
  const backdropKeys = Array.from(backdropData?.keys() ?? []);
  const backdropIndex = backdropKey !== null ? backdropKeys.indexOf(backdropKey) : -1;
  const channelData = dataset?.frames3d?.backdrops;

  const cycleBackdrop = useCallback(
    (step: number) => {
      const nextBackdropKey = backdropKeys[(backdropIndex + step + backdropKeys.length) % backdropKeys.length];
      setBackdropKey(nextBackdropKey);
      setBackdropVisible(true);
    },
    [backdropKeys, backdropIndex, setBackdropKey, setBackdropVisible]
  );

  const toggleBackdrop = useCallback(
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

  const cycleChannel = useCallback(
    (step: number) => {
      if (!channelData || channelData.length === 0) {
        return;
      }
      const lastEnabledChannel = channelSettings.reduce(
        (lastActiveIndex, setting, index) => (setting.visible ? index : lastActiveIndex),
        -1
      );
      const enabledChannelIdx = (lastEnabledChannel + step + channelData.length) % channelData.length;
      for (let i = 0; i < channelData.length; i++) {
        updateChannelSettings(i, { visible: i === enabledChannelIdx });
      }
    },
    [channelData, channelSettings, updateChannelSettings]
  );

  const toggleChannel = useCallback(
    (event: KeyboardEvent) => {
      if (!channelData || channelData.length === 0) {
        return;
      }
      const index = Number.parseInt(event.key) - 1;
      if (Number.isNaN(index) || index >= channelData.length) {
        return;
      }
      const visible = channelSettings[index]?.visible ?? false;
      updateChannelSettings(index, { visible: !visible });
    },
    [channelData, channelSettings, updateChannelSettings]
  );

  const handleCycleHotkey = isDataset3d ? cycleChannel : cycleBackdrop;
  const handleToggleHotkey = isDataset3d ? toggleChannel : toggleBackdrop;

  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.cycleForward.keycode, () => {
    handleCycleHotkey(1);
  });
  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.cycleBackward.keycode, () => {
    handleCycleHotkey(-1);
  });
  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.showChannel.keycode, handleToggleHotkey);
};
