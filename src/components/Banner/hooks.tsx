import React, { DependencyList, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import AlertBanner, { AlertBannerProps } from "./AlertBanner";

/**
 * A hook to manage a list of alert banners. When a new alert message is provided, a new banner is shown for it.
 * Additional alerts with repeat messages will be ignored until the original banner is closed.
 *
 * Banners that are closed with the "Do not show again" option checked will ignore any future alerts with identical
 * messages until the dependency list changes.
 *
 * @param deps Dependency list. When changed, clears all managed banners and resets the
 * "do not show again" behavior.
 *
 * @returns
 *   - bannerElement: A React element containing all the alert banners.
 *   - showAlert: A callback that adds a new alert banner (if it doesn't currently exist).
 *
 * @example
 * ```
 * const { bannerElement, showAlert } = useAlertBanner([someDependency]);
 *
 * try {
 *  someOperationThatCouldThrowAnError();
 * } catch (error) {
 *  showAlert({
 *    type: "error",
 *    message: "An error occurred",
 *    description: ["Encountered the following error: ", error.message],
 *    showDoNotShowAgainCheckbox: true,
 *    closable: true,
 *   });
 * }
 * ```
 */
export const useAlertBanner = (
  deps: DependencyList
): { bannerElement: ReactElement; showAlert: (props: AlertBannerProps) => void } => {
  // TODO: Additional calls to `showAlert` with different props/callbacks will be ignored; should we update the
  // banner or only ever show the first call?
  // TODO: Nice animations when banners appear or when all of them are cleared at once?
  const [bannerProps, setBannerProps] = useState<AlertBannerProps[]>([]);
  const ignoredBannerMessages = useRef(new Set<string>());

  const showAlert = useCallback(
    (props: AlertBannerProps) => {
      if (ignoredBannerMessages.current.has(props.message)) {
        return;
      }
      ignoredBannerMessages.current.add(props.message);
      setBannerProps((previousBannerProps) => [...previousBannerProps, props]);
    },
    [bannerProps, ignoredBannerMessages.current]
  );

  useEffect(() => {
    // Clear banner list
    setBannerProps([]);
    ignoredBannerMessages.current.clear();
  }, deps);

  const bannerElements = useMemo(
    () => (
      <div>
        {bannerProps.map((props: AlertBannerProps, index: number) => {
          // Extend the close callback to remove the banner from the list
          const afterClose = (doNotShowAgain: boolean): void => {
            setBannerProps((previousBannerProps) => previousBannerProps.filter((_, i) => i !== index));
            if (!doNotShowAgain) {
              ignoredBannerMessages.current.delete(props.message);
            }
            props.afterClose?.(doNotShowAgain);
          };

          return <AlertBanner key={props.message} {...props} afterClose={afterClose} />;
        })}
      </div>
    ),
    [bannerProps]
  );

  return { bannerElement: bannerElements, showAlert };
};
