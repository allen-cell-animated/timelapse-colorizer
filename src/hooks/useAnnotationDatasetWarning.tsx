import { Button } from "antd";
import React, { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import StyledModal from "src/components/Modals/StyledModal";
import { SHORTCUT_KEYS } from "src/constants";
import type { AnnotationState } from "src/hooks/useAnnotations";
import { useViewerStateStore } from "src/state";
import { FlexRow, FlexRowAlignCenter } from "src/styles/utils";
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
  const dataset = useViewerStateStore((state) => state.dataset);
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Save the callback to a ref in case it's not memoized.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const userConfirmationPromiseRef = useRef<Promise<B> | null>(null);
  const userConfirmationPromiseResolveRef = useRef<(() => void) | null>(null);
  const userConfirmationPromiseRejectRef = useRef<(() => void) | null>(null);

  const cleanupWarning = useCallback((): void => {
    setIsWarningVisible(false);
    userConfirmationPromiseResolveRef.current = null;
    userConfirmationPromiseRejectRef.current = null;
    userConfirmationPromiseRef.current = null;
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
      const hasAnnotations = !!annotationData && annotationData.getLabels().length > 0;
      const isHoldingKeepAnnotationsHotkey = areAnyHotkeysPressed(
        SHORTCUT_KEYS.annotation.keepAnnotationsBetweenDatasets.keycode
      );
      if (!hasAnnotations || isHoldingKeepAnnotationsHotkey) {
        return callbackRef.current(...args);
      }
      setIsWarningVisible(true);
      if (userConfirmationPromiseRef.current !== null) {
        return userConfirmationPromiseRef.current;
      }
      // Setup promise, which will be resolved if the user makes a selection or
      // rejected if the user closes the popup.
      userConfirmationPromiseRef.current = new Promise<B>((resolve, reject) => {
        const resolveCallback = async (): Promise<void> => {
          const result = await callbackRef.current(...args);
          resolve(result);
        };
        userConfirmationPromiseResolveRef.current = resolveCallback;
        userConfirmationPromiseRejectRef.current = reject;
      });
      return userConfirmationPromiseRef.current;
    },
    [annotationData]
  );

  const onConfirm = async (download: boolean): Promise<void> => {
    if (annotationState) {
      if (download) {
        const csvData = annotationState.data.toCsv(dataset!);
        const name = datasetKey ? `${datasetKey}-annotations.csv` : "annotations.csv";
        downloadCsv(name, csvData);
      }
      annotationState.clear();
    }
    userConfirmationPromiseResolveRef.current?.();
    cleanupWarning();
  };

  const onCancel = (): void => {
    userConfirmationPromiseRejectRef.current?.();
    cleanupWarning();
  };

  const popupElement = (
    <div ref={modalContainerRef}>
      <StyledModal
        open={isWarningVisible}
        onCancel={onCancel}
        title="Save current annotations?"
        width={400}
        getContainer={() => modalContainerRef.current || document.body}
        style={{ marginTop: 25 }}
        footer={
          <FlexRowAlignCenter style={{ justifyContent: "space-between" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <FlexRow $gap={6}>
              <Button type="default" danger onClick={() => onConfirm(false)}>
                Do not save
              </Button>
              <Button type="primary" onClick={() => onConfirm(true)}>
                Save
              </Button>
            </FlexRow>
          </FlexRowAlignCenter>
        }
      >
        <p>Annotations are not preserved between datasets; existing annotations will be discarded.</p>
        <p>Would you like to save your current annotations before continuing?</p>
      </StyledModal>
    </div>
  );

  return { popupEl: popupElement, wrappedCallback: wrappedCallback };
}
