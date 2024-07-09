import { App, ConfigProvider } from "antd";
import React, { createContext, PropsWithChildren, ReactElement, useState } from "react";
import styled from "styled-components";

import { latoRegularEot, latoRegularTtf, latoRegularWoff, latoRegularWoff2 } from "../assets";

type AppStyleProps = {
  className?: string;
};

const palette = {
  theme: "#8860d2",
  themeDark: "#5f369f",
  themeLight: "#aa88ed",
  themeGray: "#f7f0ff",
  themeGrayDark: "#e7e4f2",
  gray0: "#ffffff",
  gray5: "#fafafa",
  gray7: "#f7f7f7",
  gray10: "#f2f2f2",
  gray15: "#e7e7e7",
  gray20: "#cbcbcc",
  gray30: "#a3a4a5",
  gray40: "#737373",
  gray50: "#575859",
  gray60: "#323233",
  success: "#2fc022",
  error: "#f92d20",
  link: "#0094FF",
  linkDark: "#007FD6",
  warning: "#faad14",
  successLight: "#b7eb8f",
  errorLight: "#ffa39e",
  infoLight: "#91d5ff",
  warningLight: "#ffe58f",
};

// Note: Some advanced version of this could swap different theme objects, and
// regenerate the CssContainer along with the theme.
// These could probably be added as props to AppStyle in the future!
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
      error: palette.error,
      success: palette.success,
      theme: palette.theme,
      link: palette.link,
      linkHover: palette.linkDark,
    },
    layout: {
      background: palette.gray0,
      backgroundAlt: palette.gray7,
      tabBackground: palette.gray5,
      dividers: palette.gray15,
      borders: palette.gray20,
      modalOverlay: "rgba(0, 0, 0, 0.7)",
    },
    viewport: {
      background: palette.gray7,
      overlayBackground: "rgba(255, 255, 255, 0.8)",
      overlayOutline: "rgba(0, 0, 0, 0.2)",
    },
    button: {
      backgroundPrimary: palette.theme,
      backgroundDisabled: palette.gray10,
      outline: palette.theme,
      outlineActive: palette.themeDark,
      hover: palette.themeLight,
      active: palette.themeDark,
      focusShadow: "rgba(137, 98, 211, 0.06)",
    },
    dropdown: {
      backgroundHover: palette.gray10,
      backgroundSelected: palette.themeGray,
    },
    slider: {
      rail: palette.gray10,
    },
    flag: {
      background: palette.themeGrayDark,
    },
    tooltip: {
      background: "rgba(50, 50, 51, 0.90)",
    },
    alert: {
      border: {
        info: palette.infoLight,
        warning: palette.warningLight,
        error: palette.errorLight,
        success: palette.successLight,
      },
    },
  },
  font: {
    // LatoExtended font is a custom font family declared in the CssContainer.
    // It's downloaded from https://www.latofonts.com/, as the Google Fonts version
    // has limited characters. Here, Google Font's Lato is set as the default
    // for faster initial load, and LatoExtended is used as a fallback for specific,
    // non-Latin characters (usually scientific units).
    family: "Lato, LatoExtended, sans-serif",
    resource: "https://fonts.googleapis.com/css2?family=Lato&display=swap",
    size: {
      header: 26,
      section: 20,
      label: 16,
      content: 14,
      labelSmall: 12,
    },
  },
  controls: {
    height: 28,
    heightSmall: 28,
    radius: 4,
  },
};

export const AppThemeContext = createContext(theme);

type DocumentContextType = {
  modalContainerRef: HTMLDivElement | null;
};
export const DocumentContext = createContext<DocumentContextType>({ modalContainerRef: null });

/** Applies theme as CSS variables that affect the rest of the document. */
const CssContainer = styled.div`
  @import url("https://fonts.googleapis.com/css2?family=Lato&display=swap");

  @font-face {
    font-family: LatoExtended;
    font-style: normal;
    font-weight: 400;
    src: url(${latoRegularWoff2}) format("woff2"), url(${latoRegularWoff}) format("woff"),
      url(${latoRegularTtf}) format("truetype"), url(${latoRegularEot}) format("embedded-opentype");
  }

  /* Text */
  --color-text-primary: ${theme.color.text.primary};
  --color-text-secondary: ${theme.color.text.secondary};
  --color-text-hint: ${theme.color.text.hint};
  --color-text-disabled: ${theme.color.text.disabled};
  --color-text-button: ${theme.color.text.button};
  --color-text-error: ${theme.color.text.error};
  --color-text-success: ${theme.color.text.success};
  --color-text-theme: ${theme.color.theme};
  --color-text-theme-dark: ${theme.color.themeDark};
  --color-text-link: ${theme.color.text.link};

  /* Layout */
  --color-background-alt: ${theme.color.layout.backgroundAlt};
  --color-background: ${theme.color.layout.background};
  --color-dividers: ${theme.color.layout.dividers};
  --color-borders: ${theme.color.layout.borders};
  --color-modal-overlay: ${theme.color.layout.modalOverlay};

  /* Controls */
  /* TODO: Possible issue with hover/active colors because the UI design
  styling has the same active and hover colors (just with different outlines).
  Would dark/light theme be more descriptive? 
   */
  --color-button: ${theme.color.button.backgroundPrimary};
  --color-button-hover: ${theme.color.button.hover};
  --color-button-active: ${theme.color.button.active};
  --color-button-disabled: ${theme.color.button.backgroundDisabled};

  --button-height: ${theme.controls.height}px;
  --button-height-small: ${theme.controls.heightSmall}px;
  --radius-control-small: ${theme.controls.radius}px;

  --color-dropdown-hover: ${theme.color.dropdown.backgroundHover};
  --color-dropdown-selected: ${theme.color.dropdown.backgroundSelected};

  --color-collapse-hover: ${theme.color.theme};
  --color-collapse-active: ${theme.color.themeDark};

  --color-focus-shadow: #f2ebfa;

  --color-flag-background: ${theme.color.flag.background};
  --color-flag-text: ${theme.color.themeDark};

  --color-viewport-overlay-background: ${theme.color.viewport.overlayBackground};
  --color-viewport-overlay-outline: ${theme.color.viewport.overlayOutline};

  --color-alert-info-border: ${theme.color.alert.border.info};
  --color-alert-warning-border: ${theme.color.alert.border.warning};
  --color-alert-error-border: ${theme.color.alert.border.error};
  --color-alert-success-border: ${theme.color.alert.border.success};

  /* Fonts */
  --default-font: ${theme.font.family};
  --font-size-header: ${theme.font.size.header}px;
  --font-size-section: ${theme.font.size.section}px;
  --font-size-label: ${theme.font.size.label}px;
  --font-size-content: ${theme.font.size.content}px;
  --font-size-label-small: ${theme.font.size.labelSmall}px;

  .ant-input-number-input {
    text-align: right;
  }

  // Override button styling to match design.
  // Specifically, remove the drop shadow, and change the hover/active
  // behavior so the border changes color instead of the background.
  .ant-btn-primary:not(:disabled),
  .ant-btn-default:not(:disabled) {
    // disable drop shadow
    box-shadow: none;
  }

  // Both buttons go to solid light theme color and change text color when hovered.
  :where(.ant-btn-primary:not(:disabled):active),
  :where(.ant-btn-primary:not(:disabled):hover),
  .ant-btn-default:not(:disabled):active,
  .ant-btn-default:not(:disabled):hover {
    border-color: ${theme.color.button.hover};
    background-color: ${theme.color.button.hover};
    color: ${theme.color.text.button};
  }

  // Use the darker theme color for the primary-style, solid-color button
  .ant-btn-primary:where(:not(:disabled):active) {
    border: 1px solid ${theme.color.button.backgroundPrimary};
  }

  // Use the normal theme color for the button outline when hovered,
  // then darken it when active. This way, the outline is always visible
  // for the default button.
  .ant-btn-default:not(:disabled):hover {
    border: 1px solid ${theme.color.button.backgroundPrimary};
  }
  .ant-btn-default:not(:disabled):active {
    border: 1px solid ${theme.color.button.outlineActive};
  }
  .ant-btn-default:not(:disabled) {
    border-color: ${theme.color.button.outline};
    color: ${theme.color.button.outline};
  }

  font-family: var(--default-font);
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  margin: 0;
  color: var(--color-text-primary);

  a {
    &:focus,
    &:focus-visible {
      text-decoration: underline;
    }
  }

  h1 {
    font-size: var(--font-size-header);
    font-style: normal;
    font-weight: 400;
    margin: 5px 0;
  }

  h2 {
    font-size: var(--font-size-section);
    font-style: normal;
    font-weight: 400;
  }

  h3 {
    font-size: var(--font-size-label);
    font-style: normal;
    font-weight: 400;
    margin: 0;
  }

  p {
    font-family: var(--default-font);
    font-size: var(--font-size-content);
    font-style: normal;
    font-weight: 400;
    margin: 2px;
  }

  label {
    font-family: var(--default-font);
    font-size: var(--font-size-content);
    font-style: normal;
    font-weight: 400;
    display: flex;
    flex-direction: row;
    gap: 2px;
  }
`;

/**
 * Configures styling for the app.
 * @param props:
 *   - className: Optional className that will be applied to a `div` element that
 *     contains the provided children elements.
 *   - children: All the children that should be rendered with the applied styling.
 */
export default function AppStyle(props: PropsWithChildren<AppStyleProps>): ReactElement {
  // Provide a div container element for modals. This allows them to float over
  // other elements in the app and escape their local stacking contexts,
  // while still obeying styling rules.
  const [modalContainer, setModalContainer] = useState<HTMLDivElement | null>(null);

  return (
    <CssContainer className={props.className}>
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href={theme.font.resource} rel="stylesheet" />

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: theme.color.theme,
            colorLink: theme.color.text.link,
            colorLinkHover: theme.color.text.linkHover,
            colorBorder: theme.color.layout.borders,
            colorBorderSecondary: theme.color.layout.dividers,
            colorBgContainerDisabled: theme.color.button.backgroundDisabled,
            controlHeight: theme.controls.height,
            colorTextQuaternary: theme.color.text.disabled,
            controlHeightSM: theme.controls.heightSmall,
            fontFamily: theme.font.family,
            borderRadiusLG: 6,
            colorText: theme.color.text.primary,
            colorTextPlaceholder: theme.color.text.hint,
            colorBgSpotlight: theme.color.tooltip.background,
            fontWeightStrong: 400,
          },
          components: {
            Button: {
              colorPrimaryActive: theme.color.button.hover,
              colorPrimaryHover: theme.color.button.hover,
              textHoverBg: theme.color.text.button,
              colorBgTextHover: theme.color.text.button,
              defaultBorderColor: theme.color.theme,
              defaultColor: theme.color.theme,
            },
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
              railBg: theme.color.slider.rail,
              railHoverBg: theme.color.slider.rail,
              controlHeightSM: 20,
              trackHoverBg: theme.color.themeLight,
            },
            Tabs: {
              itemColor: theme.color.text.primary,
              cardBg: theme.color.layout.tabBackground,
              colorBorder: theme.color.layout.borders,
              colorBorderSecondary: theme.color.layout.borders,
            },
            Tooltip: {
              zIndexPopup: 2000,
            },
            Divider: {
              marginLG: 0,
            },
            Modal: {
              // Set z-index to 2100 here because Ant sets popups to 1050 by default, and modals to 1000.
              zIndexBase: 2100,
              zIndexPopupBase: 2100,
              titleFontSize: theme.font.size.section,
              margin: 20,
            },
          },
        }}
      >
        {/* App provides context for the static notification, modal, and message APIs.
         * See https://ant.design/components/app.
         */}
        <App>
          <div ref={setModalContainer}>
            <DocumentContext.Provider value={{ modalContainerRef: modalContainer }}>
              {props.children}
            </DocumentContext.Provider>
          </div>
        </App>
      </ConfigProvider>
    </CssContainer>
  );
}
