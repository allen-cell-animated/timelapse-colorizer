import React, { PropsWithChildren, ReactElement } from "react";
import { ConfigProvider } from "antd";
import styled from "styled-components";

type AppStyleProps = {
  className?: string;
};

// TODO: Some future version of this could swap different theme objects, and
// regenerate the CssContainer along with the theme.
// TODO: Parameterize the rest of the variables as needed!
/** Top-level theme variables, used to drive the styling of the entire app. */
const theme = {
  color: {
    theme: "#8962d3",
    themeDark: "#5f369f",
    themeLight: "#aa88ed",
  },
  font: {
    family: "Lato",
    resource: "https://fonts.googleapis.com/css2?family=Lato&display=swap",
    size: {
      header: 22,
      section: 20,
      label: 16,
      content: 14,
    },
  },
  controls: {
    height: 30,
    heightSmall: 28,
  },
};

/** Applies theme as CSS variables that affect the rest of the document. */
const CssContainer = styled.div`
  @import url("https://fonts.googleapis.com/css2?family=Lato&display=swap");

  /* UI Design Colors */
  --color-theme: ${theme.color.theme};
  --color-theme-dark: ${theme.color.themeDark};
  --color-theme-rgb: 137, 98, 211;
  --color-theme-light: ${theme.color.themeLight};
  --color-gray-0: #ffffff;
  --color-gray-5: #f3f4f5;
  --color-gray-10: #e6e7e8;
  --color-gray-20: #cbcbcc;
  --color-gray-30: #a3a4a5;
  --color-gray-40: #7c7d7f;
  --color-gray-50: #575859;
  --color-gray-60: #323233;
  --color-success: #2fc022;
  --color-error: #f92d20;

  /* Text */
  --color-text-primary: var(--color-gray-60);
  --color-text-secondary: var(--color-gray-50);
  --color-text-hint: var(--color-gray-30);
  --color-text-disabled: var(--color-gray-30);
  --color-text-button: var(--color-gray-0);

  /* Layout */
  --color-background: var(--color-gray-0);
  --color-dividers: var(--color-gray-10);
  --color-borders: var(--color-gray-20);
  --color-modal-overlay: rgba(0, 0, 0, 0.7);

  /* Buttons */
  /* Note: Button color is largely controlled by Antd. See 'main.tsx' and https://ant.design/docs/react/customize-theme#maptoken to override. */
  --color-button: var(--color-theme);
  --color-button-hover: var(--color-theme-light);
  --color-button-active: var(--color-theme-dark);
  --color-button-disabled: var(--color-gray-5);

  --button-height: ${theme.controls.height}px;
  --button-height-small: ${theme.controls.heightSmall}px;

  --color-focus-shadow: rgba(137, 98, 211, 0.06);

  /* Fonts */
  --default-font: "${theme.font.family}";
  --font-size-header: ${theme.font.size.header}px;
  --font-size-section: ${theme.font.size.section}px;
  --font-size-label: ${theme.font.size.label}px;
  --font-size-content: ${theme.font.size.content}px;
`;

/**
 * Configures styling for the app.
 * @param props:
 *   - className: Optional className that will be applied to a `div` element that
 *     contains the provided children elements.
 *   - children: All the children that should be rendered with the applied styling.
 */
export default function AppStyle(props: PropsWithChildren<AppStyleProps>): ReactElement {
  // TODO: Make a single source of truth for CSS variables + theme so that
  // JS and CSS can access the same values.
  // Solution should accommodate the ability to switch themes on the fly.
  //
  // Possible solutions include:
  //  - CSS modules (export), variables live in CSS
  //  - Create a local style using styled-components
  // https://www.joshwcomeau.com/css/css-variables-for-react-devs/

  return (
    <CssContainer className={props.className}>
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href={theme.font.resource} rel="stylesheet" />

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: theme.color.theme,
            colorLink: theme.color.theme,
            colorLinkHover: theme.color.themeDark,
            controlHeight: theme.controls.height,
            controlHeightSM: theme.controls.heightSmall,
            fontFamily: theme.font.family,
            borderRadiusLG: 4,
          },
          components: {
            Checkbox: {
              borderRadiusSM: 2,
              controlInteractiveSize: 16,
              fontSize: theme.font.size.content,
              paddingXS: 6,
            },
            Slider: {
              // Override hover colors
              dotActiveBorderColor: theme.color.theme,
              dotBorderColor: theme.color.themeLight,
              handleActiveColor: theme.color.themeLight,
              handleColor: theme.color.theme,
              trackBg: theme.color.theme,
              controlHeightSM: 20,
              trackHoverBg: theme.color.themeLight,
            },
            Divider: {
              marginLG: 0,
            },
          },
        }}
      >
        {props.children}
      </ConfigProvider>
    </CssContainer>
  );
}
