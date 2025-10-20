import { Button, ColorPicker, ColorPickerProps } from "antd";
import React, { ReactElement, useContext, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { AppTheme, AppThemeContext } from "src/styles/AppStyle";
import { antToThreeColor } from "src/utils/color_utils";

type WrappedColorPickerProps = ColorPickerProps & {
  id?: string;
  containerStyle?: React.CSSProperties;
};

// Square button trigger with an inset color block inside
const StyledColorPickerTrigger = styled(Button)<{ $theme: AppTheme; $open: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 4px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;

  &&& {
    border: 1px solid ${(props) => (props.$open ? props.$theme.color.button.active : props.$theme.color.layout.borders)};
    outline: ${(props) => (props.$open ? `2px solid ${props.$theme.color.button.focusShadow}` : "none")};
    background: transparent;

    &:hover,
    &:active {
      background: transparent;
    }

    &:focus-visible {
      outline: 3px solid ${(props) => props.$theme.color.button.focusShadow};
      outline-offset: 1;
    }

    &:disabled {
      border-color: ${(props) => props.$theme.color.layout.borders};
      background: ${(props) => props.$theme.color.button.backgroundDisabled};
    }
  }
`;

const ColorPickerContainer = styled.div`
  & .ant-color-picker .ant-color-picker-alpha-input {
    & > .ant-input-number-input-wrap > .ant-input-number-input.ant-input-number-input {
      padding-inline-end: 4px;
    }

    & > .ant-input-number-handler-wrap {
      /* 
       * Hide the increment/decrement buttons on the number input for opacity,
       * since they cover the text.
      */
      visibility: hidden;
    }
  }
`;

// Smaller block inside the trigger that shows the selected color,
// including a transparent checkerboard pattern.
const ColorPickerBlock = styled.div<{ $theme: AppTheme }>`
  width: 14px;
  height: 14px;
  // Transparency checkerboard pattern
  background-image: conic-gradient(
    rgba(0, 0, 0, 0.06) 0 25%,
    transparent 0 50%,
    rgba(0, 0, 0, 0.06) 0 75%,
    transparent 0
  );
  background-size: 50% 50%;
  border-radius: 2px;

  // Selected color
  & > div {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    box-sizing: border-box;
  }
`;

/**
 * Wraps the Ant Design ColorPicker component.
 *
 * This fixes several accessibility issues, including:
 * - Popup was placed in a separate part of DOM (direct child of
 *   `document.body`)
 * - Base ColorPicker was not accessible via keyboard navigation (used a
 *   non-focusable `div` as trigger)
 * - `id` could not be set on the ColorPicker trigger for labeling
 */
export default function WrappedColorPicker(props: WrappedColorPickerProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);

  const colorCss = useMemo(() => {
    const { value } = props;
    if (!value) {
      return "transparent";
    }
    const { color: threeColor, alpha } = antToThreeColor(value as string);
    threeColor.convertLinearToSRGB();
    return `rgb(${threeColor.r * 255}, ${threeColor.g * 255}, ${threeColor.b * 255}, ${alpha})`;
  }, [props.value]);

  return (
    <ColorPickerContainer ref={colorPickerContainerRef} style={props.containerStyle}>
      <ColorPicker
        getPopupContainer={() => colorPickerContainerRef.current || document.body}
        {...props}
        onOpenChange={(open) => {
          setIsOpen(open);
          props.onOpenChange?.(open);
        }}
      >
        <StyledColorPickerTrigger type="default" id={props.id} disabled={props.disabled} $theme={theme} $open={isOpen}>
          <ColorPickerBlock $theme={theme}>
            <div style={{ backgroundColor: colorCss }} />
          </ColorPickerBlock>
        </StyledColorPickerTrigger>
      </ColorPicker>
    </ColorPickerContainer>
  );
}
