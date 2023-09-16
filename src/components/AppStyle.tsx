import React, { PropsWithChildren, ReactElement, createContext } from "react";
import { ConfigProvider } from "antd";
import styled from "styled-components";

type AppStyleProps = {
  className?: string;
};

const palette = {
  theme: "#8962d3",
  themeDark: "#5f369f",
  themeLight: "#aa88ed",
  gray0: "#ffffff",
  gray5: "#f3f4f5",
  gray10: "#e6e7e8",
  gray20: "#cbcbcc",
  gray30: "#a3a4a5",
  gray40: "#7c7d7f",
  gray50: "#575859",
  gray60: "#323233",
  success: "#2fc022",
  error: "#f92d20",
};

// TODO: Some future version of this could swap different theme objects, and
// regenerate the CssContainer along with the theme.
/** Top-level theme variables, used to drive the styling of the entire app. */
const theme = {
  color: {
    theme: palette.theme,
    themeDark: palette.themeDark,
    themeLight: palette.themeLight,
    text: {
      primary: palette.gray60,
      secondary: palette.gray50,
      hint: palette.gray30,
      disabled: palette.gray30,
      button: palette.gray0,
    },
    layout: {
      background: palette.gray0,
      dividers: palette.gray10,
      borders: palette.gray20,
      modalOverlay: "rgba(0, 0, 0, 0.7)",
    },
    button: {
      background: palette.theme,
      hover: palette.themeLight,
      active: palette.themeDark,
      disabled: palette.gray5,
      focusShadow: "rgba(137, 98, 211, 0.06)",
    },
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

export const ThemeContext = createContext(theme);

// TODO: Remove --color-theme wherever it's used in other CSS documents
/** Applies theme as CSS variables that affect the rest of the document. */
const CssContainer = styled.div`
  @import url("https://fonts.googleapis.com/css2?family=Lato&display=swap");

  /* UI Design Colors */
  --color-theme: ${theme.color.theme};
  --color-theme-dark: ${theme.color.themeDark};
  --color-theme-light: ${theme.color.themeLight};

  /* Text */
  --color-text-primary: ${theme.color.text.primary};
  --color-text-secondary: ${theme.color.text.secondary};
  --color-text-hint: ${theme.color.text.hint};
  --color-text-disabled: ${theme.color.text.disabled};
  --color-text-button: ${theme.color.text.button};

  /* Layout */
  --color-background: ${theme.color.layout.background};
  --color-dividers: ${theme.color.layout.dividers};
  --color-borders: ${theme.color.layout.borders};
  --color-modal-overlay: ${theme.color.layout.modalOverlay};

  /* Buttons */
  --color-button: ${theme.color.button.background};
  --color-button-hover: ${theme.color.button.hover};
  --color-button-active: ${theme.color.button.active};
  --color-button-disabled: ${theme.color.button.disabled};

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
            colorText: theme.color.text.primary,
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
