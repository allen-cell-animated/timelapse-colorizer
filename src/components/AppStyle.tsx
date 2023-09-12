import React, { PropsWithChildren, ReactElement } from "react";
import { ConfigProvider } from "antd";

type AppStyleProps = {
  className?: string;
};

/**
 * Configures Antd styling for the app.
 * @param props:
 *   - className: Optional className that will be applied to a `div` element that
 *     contains the provided children elements.
 *   - children: All the children that should be rendered with the applied styling.
 */
export default function AppStyle(props: PropsWithChildren<AppStyleProps>): ReactElement {
  const theme = "#8962d3";
  const themeDark = "#5f369f";
  const themeLight = "#aa88ed";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme,
          colorLink: theme,
          colorLinkHover: themeDark,
          controlHeight: 24,
          fontFamily: "Lato",
          borderRadiusLG: 4,
        },
        components: {
          Checkbox: {
            borderRadiusSM: 2,
            controlInteractiveSize: 16,
            fontSize: 14,
            paddingXS: 6,
          },
          Slider: {
            dotActiveBorderColor: theme,
            dotBorderColor: themeLight,
            handleActiveColor: themeLight,
            handleColor: theme,
            trackBg: theme,
            trackHoverBg: themeLight,
          },
          Divider: {
            marginLG: 0,
          },
        },
      }}
    >
      <div className={props.className}>{props.children}</div>
    </ConfigProvider>
  );
}
