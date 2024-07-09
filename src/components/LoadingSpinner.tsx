import { LoadingOutlined } from "@ant-design/icons";
import { Progress, Spin } from "antd";
import React, { PropsWithChildren, ReactElement, ReactNode } from "react";
import styled, { css } from "styled-components";

type LoadingSpinnerProps = {
  loading: boolean;
  iconSize?: number;
  style?: React.CSSProperties;
  /** Integer percentage to display, from 0 to 100, inclusive.
   * If undefined, the spinner will be shown without progress.
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
    // Disable delay when loading is complete
    return css`
      opacity: opacity 0.25s ease-in-out ${props.$loading ? "0.5" : "0"};
    `;
  }}

  ${(props) => {
    return css`
      opacity: ${props.$loading ? 1 : 0};
    `;
  }}

  /* Center the spinner */
  display: flex;
  justify-content: center;
  align-items: center;

  /* Prevent the inner text from turning purple when progress finishes */
  & .ant-progress-text {
    color: var(--color-text-primary) !important;
  }
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

/**
 * Applies a loading spinner overlay on the provided children, which can be toggled on and off via props.
 */
export default function LoadingSpinner(inputProps: PropsWithChildren<LoadingSpinnerProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LoadingSpinnerProps>>;

  // Disable completion checkmark by forcing value to always be shown as a number %
  const progressFormatter = (percent?: number): ReactNode => {
    if (percent === undefined) {
      return "";
    }
    return `${percent}%`;
  };

  return (
    <LoadingSpinnerContainer style={props.style}>
      <LoadingSpinnerOverlay $loading={props.loading}>
        {props.progress === undefined || props.progress === null ? (
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
        ) : (
          <Progress type="circle" percent={props.progress} size={props.iconSize} format={progressFormatter} />
        )}
      </LoadingSpinnerOverlay>
      {props.children}
    </LoadingSpinnerContainer>
  );
}
