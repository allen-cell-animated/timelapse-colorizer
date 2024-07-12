import { LoadingOutlined } from "@ant-design/icons";
import { Progress, Spin } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode } from "react";
import styled, { css } from "styled-components";

import { useDebounce } from "../colorizer/utils/react_utils";

const VANISH_DURATION_MS = 250;

type LoadingSpinnerProps = {
  loading: boolean;
  iconSize?: number;
  style?: React.CSSProperties;
  /**
   * Integer percentage to display, from 0 to 100, inclusive.
   * If null or undefined, the regular spinner (without progress indicators)
   * is shown.
   */
  progress?: number | null;
};

const defaultProps: Partial<LoadingSpinnerProps> = {
  iconSize: 72,
  style: {},
};

const LoadingSpinnerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const LoadingSpinnerOverlay = styled.div<{ $loading: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
  background-color: #ffffff90;
  ${(props) => {
    if (!props.$loading) {
      // Disable delay + shorten animation when loading is complete
      return css`
        opacity: 0;
        transition: opacity ${VANISH_DURATION_MS}ms ease-in-out 0s;
      `;
    }
    return css`
      opacity: 1;
      transition: opacity 0.5s ease-in-out 0.75s;
    `;
  }}

  /* Center the spinner */
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoadSpinnerIconContainer = styled.div<{ $fontSize: number }>`
  position: relative;

  ${(props) => {
    return css`
      & > * {
        position: absolute;
        font-size: ${props.$fontSize}px;
        color: var(--color-text-hint);
        top: calc(50% - ${props.$fontSize / 2}px);
        left: calc(50% - ${props.$fontSize / 2}px);
      }
    `;
  }}
`;

// Disable completion checkmark by forcing value to always be shown as a number %
const progressFormatter = (percent?: number): ReactNode => {
  if (percent === undefined) {
    return "";
  }
  return `${percent}%`;
};

/**
 * Applies a loading spinner overlay on the provided children, which can be toggled on and off via props.
 */
export default function LoadingSpinner(inputProps: PropsWithChildren<LoadingSpinnerProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LoadingSpinnerProps>>;

  // Delay showing progress bar slightly; this fixes a visual bug where the loading spinner
  // would flash the progress bar at 100% right as it vanished.
  const showProgressBar = useDebounce(props.progress !== undefined && props.progress !== null, VANISH_DURATION_MS);

  return (
    <LoadingSpinnerContainer style={props.style}>
      <LoadingSpinnerOverlay $loading={props.loading}>
        {showProgressBar && props.progress !== undefined && props.progress !== null ? (
          <Progress
            type="circle"
            percent={props.progress}
            size={props.iconSize}
            format={progressFormatter}
            status="normal"
          />
        ) : (
          <Spin
            indicator={
              <LoadSpinnerIconContainer $fontSize={props.iconSize}>
                {/* Make larger loading icon by multiple of them together */}
                {/* TODO: Make custom loading spinner SVG? */}
                <LoadingOutlined />
                <LoadingOutlined rotate={90} />
                <LoadingOutlined rotate={135} />
              </LoadSpinnerIconContainer>
            }
          ></Spin>
        )}
      </LoadingSpinnerOverlay>
      {props.children}
    </LoadingSpinnerContainer>
  );
}
