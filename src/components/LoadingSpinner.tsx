import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

type LoadingSpinnerProps = {
  loading: boolean;
  iconSize?: number;
  style?: React.CSSProperties;
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
  transition: opacity 0.2s ease-in-out 0.2s;

  ${(props) => {
    return css`
      opacity: ${props.$loading ? 1 : 0};
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

// TODO: This component is redundant with the built-in Ant Design Spin component. Remove it?
/**
 * Applies a loading spinner overlay on the provided children, which can be toggled on and off via props.
 */
export default function LoadingSpinner(inputProps: PropsWithChildren<LoadingSpinnerProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LoadingSpinnerProps>>;
  return (
    <LoadingSpinnerContainer style={props.style}>
      <LoadingSpinnerOverlay $loading={props.loading}>
        <Spin
          indicator={
            <LoadSpinnerIconContainer $fontSize={props.iconSize}>
              {/* Make larger loading icon by merging two of them together */}
              <LoadingOutlined />
              <LoadingOutlined rotate={90} />
            </LoadSpinnerIconContainer>
          }
        ></Spin>
      </LoadingSpinnerOverlay>
      {props.children}
    </LoadingSpinnerContainer>
  );
}
