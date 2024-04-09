import React, { DependencyList, ReactElement, useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import AlertBanner, { AlertBannerProps } from "./AlertBanner";

/**
 * A hook to manage a list of alert banners. When a new alert message is provided, it is added to the list of
 * banners to show. Banners with repeat messages will be ignored until the original banner is closed.
 *
 * Banners that are closed with the "Do not show again" option checked will ignore any future identical
 * messages until the dependency list changes.
 *
 * @param deps Dependency list. When changed, clears the visible banners and resets the
 * "do not show again" behavior.
 *
 * @returns:
 *   - bannerElement: A React element containing all the alert banners.
 *   - showAlert: A callback that adds a new alert banner (if it doesn't currently exist).
 */
export const useAlertBanner = (
  deps: DependencyList
): { bannerElement: ReactElement; showAlert: (props: AlertBannerProps) => void } => {
  // TODO: Additional calls to `showAlert` with different props/callbacks will be ignored; should we update the
  // banner or only ever show the first call?
  // TODO: Nice animations when banners appear or are closed?
  const [bannerProps, setBannerProps] = useReducer(
    (_currentBanners: AlertBannerProps[], newBanners: AlertBannerProps[]) => newBanners,
    []
  );
  const ignoredBannerMessages = useRef(new Set<string>());

  const showAlert = useCallback(
    // Modify props to add a listener for the close event so we can delete the banner.
    (props: AlertBannerProps) => {
      if (ignoredBannerMessages.current.has(props.message)) {
        return;
      }
      ignoredBannerMessages.current.add(props.message);
      setBannerProps([...bannerProps, props]);
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
            setBannerProps(bannerProps.filter((_, i) => i !== index));
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
