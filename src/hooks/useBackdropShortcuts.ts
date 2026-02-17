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

  //// 2D backdrops

  const cycleBackdrop = useCallback(
    (step: 1 | -1) => {
      if (backdropKeys.length === 0 || backdropIndex === -1) {
        return;
      }

      let nextBackdropIdx;
      if (!backdropVisible) {
        // If backdrops aren't visible, enable them on first press. This always
        // switches to the first or last backdrop in the list.
        nextBackdropIdx = step === 1 ? 0 : backdropKeys.length - 1;
        setBackdropVisible(true);
      } else if (backdropIndex + step < 0 || backdropIndex + step >= backdropKeys.length) {
        // If cycling past the first or last backdrop, hide backdrops.
        nextBackdropIdx = backdropIndex;
        setBackdropVisible(false);
      } else {
        // Otherwise, cycle to next backdrop
        nextBackdropIdx = backdropIndex + step;
      }

      const nextBackdropKey = backdropKeys[nextBackdropIdx];
      setBackdropKey(nextBackdropKey);
    },
    [backdropKeys, backdropIndex, backdropVisible, setBackdropKey, setBackdropVisible]
  );

  const toggleBackdrop = useCallback(
    (event: KeyboardEvent) => {
      const newIndex = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(newIndex) || newIndex < 0 || newIndex >= backdropKeys.length) {
        return;
      }
      if (newIndex === backdropIndex) {
        // Toggle visibility if backdrop is already selected
        setBackdropVisible(!backdropVisible);
      } else {
        setBackdropKey(backdropKeys[newIndex]);
        setBackdropVisible(true);
      }
    },
    [backdropKeys, backdropIndex, backdropVisible, setBackdropKey, setBackdropVisible]
  );

  //// 3D channels

  const cycleChannel = useCallback(
    (step: 1 | -1) => {
      if (!channelData || channelData.length === 0) {
        return;
      }
      const lastEnabledChannel = channelSettings.reduce(
        (lastActiveIndex, setting, index) => (setting.visible ? index : lastActiveIndex),
        -1
      );
      const hasEnabledChannel = channelSettings.some((setting) => setting.visible);

      let enabledChannelIdx;
      if (!hasEnabledChannel) {
        // If channels are all disabled, go to the first or last channel.
        enabledChannelIdx = step === 1 ? 0 : channelData.length - 1;
      } else if (lastEnabledChannel + step < 0 || lastEnabledChannel + step >= channelData.length) {
        // If cycling past the first or last channel, disable all channels
        enabledChannelIdx = -1;
      } else {
        // Otherwise, cycle through channels.
        enabledChannelIdx = lastEnabledChannel + step;
      }
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
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= channelData.length) {
        return;
      }
      const visible = channelSettings[index]?.visible ?? false;
      updateChannelSettings(index, { visible: !visible });
    },
    [channelData, channelSettings, updateChannelSettings]
  );

  //// Hotkey handlers

  const handleCycleHotkey = isDataset3d ? cycleChannel : cycleBackdrop;
  const handleToggleHotkey = isDataset3d ? toggleChannel : toggleBackdrop;

  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.cycleForward.keycode, () => handleCycleHotkey(1));
  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.cycleBackward.keycode, () => handleCycleHotkey(-1));
  useHotkeys(SHORTCUT_KEYS.backdropsOrChannels.showChannel.keycode, handleToggleHotkey);
};
