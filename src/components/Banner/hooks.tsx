import React, { DependencyList, ReactElement, useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import AlertBanner, { AlertBannerProps } from "./AlertBanner";

/**
 * A hook to manage a list of alert banners. When a new alert message is provided, it is added to the list of
 * banners to show. Banners with repeat messages will be ignored until the original banner is closed.
 * Banners that are closed with the "Do not show again" option checked will ignore identical messages
 * until the dependency list changes.
 *
 * @param deps Dependency list. When changed, clears the banner lists and resets the
 * "do not show again" behavior.
 *
 * @returns:
 *   - bannerEl: A React element containing all the alert banners.
 *   - showAlert: A callback that adds a new alert banner (if it doesn't currently exist).
 */
export const useAlertBanner = (
  deps: DependencyList
): { bannerEl: ReactElement; showAlert: (props: AlertBannerProps) => void } => {
  // TODO: Additional calls to `showAlert` with different `onClose` callbacks will be ignored; should probably
  // be added to a list of callbacks to call when the banner is closed.
  // TODO: Alerts are currently keyed by message, and only the first call for a message wil lbe
  const [bannerProps, setBannerProps] = useReducer(
    (_currentBanners: AlertBannerProps[], newBanners: AlertBannerProps[]) => newBanners,
    []
  );

  // Do not render banner messages that are already seen or currently being rendered.
  const seenBannerMessages = useRef(new Set<string>());

  const showAlert = useCallback(
    (props: AlertBannerProps) => {
      // Modify props to add a listener for the close event
      // Check if banner message has been seen; if so we are already rendering this banner (or have forcibly
      // disabled it) and should ignore it.
      // TODO: Update currently rendered banner instead of ignoring?
      if (seenBannerMessages.current.has(props.message)) {
        return;
      }
      seenBannerMessages.current.add(props.message);
      setBannerProps([...bannerProps, props]);
    },
    [bannerProps, seenBannerMessages.current]
  );

  useEffect(() => {
    // Clear banner list
    setBannerProps([]);
    seenBannerMessages.current.clear();
  }, deps);

  const bannerElements = useMemo(
    () => (
      <div>
        {bannerProps.map((props: AlertBannerProps | undefined, index: number) => {
          if (!props) {
            return null;
          }
          // Add a listener to the onClose event to remove the banner from the list.
          const afterClose = (doNotShowAgain: boolean) => {
            setBannerProps(bannerProps.filter((_, i) => i !== index));
            if (!doNotShowAgain) {
              seenBannerMessages.current.delete(props.message);
            }
            props.afterClose?.(doNotShowAgain);
          };

          return <AlertBanner key={props.message} {...props} afterClose={afterClose} />;
        })}
      </div>
    ),
    [bannerProps]
  );

  return { bannerEl: bannerElements, showAlert };
};
