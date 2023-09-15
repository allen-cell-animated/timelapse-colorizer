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
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#8962d3",
          colorLink: "#8962d3",
          colorLinkHover: "#5f369f",
          controlHeight: 24,
          fontFamily: "Lato",
          borderRadiusLG: 4,
        },
      }}
    >
      <div className={props.className}>{props.children}</div>
    </ConfigProvider>
  );
}
