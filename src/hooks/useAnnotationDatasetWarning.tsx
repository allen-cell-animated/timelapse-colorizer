import { CloseOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { Button, Popover } from "antd";
import React, { type ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";

import IconButton from "src/components/Buttons/IconButton";
import { KeyCharacter } from "src/components/Display/ShortcutKeyText";
import { SHORTCUT_KEYS } from "src/constants";
import type { AnnotationState } from "src/hooks/useAnnotations";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { downloadCsv } from "src/utils/file_io";
import { areAnyHotkeysPressed } from "src/utils/user_input";

/**
 * Wraps a callback to show a confirmation popup if there are existing
 * annotations that might be mismatched after changing datasets. Gives an option
 * to keep annotations or download and clear them.
 * @param annotationState Current annotation state.
 * @param callback Callback to wrap.
 * @returns An object with two properties:
 *   - popupEl: A React element containing the confirmation popup. Place this
 *     after the component that triggers the action (e.g. a load button).
 *  - wrappedCallback: The wrapped callback to use in place of the original
 *    callback. Use this for the action that triggers the dataset change.
 */
export function useAnnotationDatasetWarning<A extends unknown[], B>(
  callback: (...args: A) => Promise<B>,
  annotationState?: AnnotationState
): { popupEl: ReactElement; wrappedCallback: (...args: A) => Promise<B> } {
  const theme = useContext(AppThemeContext);
  const dataset = useViewerStateStore((state) => state.dataset);
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const popupContainerRef = useRef<HTMLDivElement>(null);

  // Save the callback to a ref in case it's not memoized.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const userConfirmationPromiseResolveRef = useRef<(() => void) | null>(null);
  const userConfirmationPromiseRejectRef = useRef<(() => void) | null>(null);

  const cleanupWarning = useCallback((): void => {
    setIsWarningVisible(false);
    userConfirmationPromiseResolveRef.current = null;
    userConfirmationPromiseRejectRef.current = null;
  }, []);

  useEffect(() => {
    // Clear annotation warning if dataset changes
    cleanupWarning();
  }, [dataset, cleanupWarning]);

  // Prompt the user for additional confirmation if there are annotations that
  // need to be handled before completing the action (callback).
  const annotationData = annotationState?.data;
  const wrappedCallback = useCallback(
    async (...args: A): Promise<B> => {
      const hasAnnotations = annotationData && annotationData.getLabels().length > 0;
      const isHoldingKeepAnnotationsHotkey = areAnyHotkeysPressed(
        SHORTCUT_KEYS.annotation.keepAnnotationsBetweenDatasets.keycode
      );
      if (!hasAnnotations || isHoldingKeepAnnotationsHotkey) {
        return callbackRef.current(...args);
      }
      setIsWarningVisible(true);
      // Setup promise, which will be resolved if the user makes a selection or
      // rejected if the user closes the popup.
      const userConfirmationPromise = new Promise<B>((resolve, reject) => {
        const resolveCallback = async (): Promise<void> => {
          const result = await callbackRef.current(...args);
          resolve(result);
        };
        userConfirmationPromiseResolveRef.current = resolveCallback;
        userConfirmationPromiseRejectRef.current = reject;
      });
      return userConfirmationPromise;
    },
    [annotationData]
  );

  const downloadAndClearAnnotations = async (): Promise<void> => {
    if (annotationState) {
      const csvData = annotationState.data.toCsv(dataset!);
      const name = datasetKey ? `${datasetKey}-annotations.csv` : "annotations.csv";
      downloadCsv(name, csvData);
      annotationState.clear();
    }
  };

  const onConfirm = async (clearAnnotations: boolean): Promise<void> => {
    if (clearAnnotations) {
      await downloadAndClearAnnotations();
    }
    userConfirmationPromiseResolveRef.current?.();
    cleanupWarning();
  };

  const onCancel = (): void => {
    userConfirmationPromiseRejectRef.current?.();
    cleanupWarning();
  };

  const annotationPopupContents = (
    <FlexColumn style={{ maxWidth: 350 }} $gap={12}>
      <FlexRow $gap={10}>
        <ExclamationCircleFilled style={{ color: theme.color.text.warning, margin: "6px 0 auto 0" }} />
        <FlexColumn>
          <FlexRowAlignCenter style={{ justifyContent: "space-between" }}>
            <p style={{ margin: "2px 0" }}>Clear annotations before changing datasets?</p>
            <IconButton type="text" sizePx={20} onClick={onCancel}>
              <CloseOutlined />
            </IconButton>
          </FlexRowAlignCenter>
          <span style={{ color: theme.color.text.secondary, margin: "2px 0" }}>
            Existing annotations will be applied to the wrong objects if tracks differ.
          </span>
          <span style={{ color: theme.color.text.secondary, margin: "2px 0" }}>
            (Hold <KeyCharacter>{SHORTCUT_KEYS.annotation.keepAnnotationsBetweenDatasets.keycodeDisplay}</KeyCharacter>{" "}
            in the future to keep annotations and skip this message.)
          </span>
        </FlexColumn>
      </FlexRow>
      <FlexRow $gap={6}>
        <Button onClick={() => onConfirm(false)}>Keep Annotations</Button>
        <Button type="primary" onClick={() => onConfirm(true)}>
          Save and Clear Annotations
        </Button>
      </FlexRow>
    </FlexColumn>
  );

  const popupElement = (
    <Popover
      trigger={["click", "focus"]}
      content={annotationPopupContents}
      open={isWarningVisible}
      onOpenChange={onCancel}
      placement="bottom"
      style={{ width: "300px" }}
      getPopupContainer={() => popupContainerRef.current || document.body}
    >
      <div ref={popupContainerRef}></div>
    </Popover>
  );

  return { popupEl: popupElement, wrappedCallback: wrappedCallback };
}
