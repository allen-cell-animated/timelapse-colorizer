import React, { DependencyList, ReactElement, useCallback, useMemo, useRef, useState } from "react";

import AlertBanner, { AlertBannerProps } from "./AlertBanner";

export type ShowAlertBannerCallback = (props: AlertBannerProps) => void;
export type ClearBannersCallback = () => void;

/**
 * A hook to manage a list of alert banners. When a new alert message is provided, a new banner is shown for it.
 * Additional alerts with repeat messages will be ignored until the original banner is closed.
 *
 * Banners that are closed with the "Do not show again" option checked will ignore any future alerts with identical
 * messages until the dependency list changes.
 *
 * @param deps Dependency list. When elements change, clears all managed banners and resets the
 * "do not show again" behavior. Empty by default.
 *
 * @returns
 *   - bannerElement: A React element containing all the alert banners.
 *   - showAlert: A callback that adds a new alert banner (if it doesn't currently exist).
 *   - clearBanners: A callback that clears all alert banners and resets the "do not show again" behavior.
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
  deps: DependencyList = []
): {
  bannerElement: ReactElement;
  showAlert: ShowAlertBannerCallback;
  clearBanners: ClearBannersCallback;
} => {
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

  const clearBanners = useCallback(() => {
    setBannerProps((_previousBannerProps) => []);
    ignoredBannerMessages.current.clear();
  }, []);

  // Automatically clear banners when the dependency list changes.
  useMemo(() => {
    clearBanners();
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

  return { bannerElement: bannerElements, showAlert, clearBanners };
};
