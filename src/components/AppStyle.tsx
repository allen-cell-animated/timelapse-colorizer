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

  // TODO: Make a single source of truth for CSS variables + theme so that
  // JS and CSS can access the same values.
  // Solution should accommodate the ability to switch themes on the fly.
  //
  // Possible solutions include:
  //  - CSS modules (export), variables live in CSS
  //  - Create a local style using styled-components
  // https://www.joshwcomeau.com/css/css-variables-for-react-devs/

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme,
          colorLink: theme,
          colorLinkHover: themeDark,
          controlHeight: 30,
          controlHeightSM: 28,
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
            controlHeightSM: 20,
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
