import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

type LoadingSpinnerProps = {
  loading: boolean;
  iconSize?: number;
  style: React.CSSProperties;
};

const defaultProps: Partial<LoadingSpinnerProps> = {
  iconSize: 48,
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
  z-index: 1;
  pointer-events: none;
  background-color: #00000040;
  transition: 0.2s ease-in-out;

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

/**
 * Applies a loading spinner overlay on the provided children, which can be toggled on and off via props.
 */
export default function LoadingSpinner(inputProps: PropsWithChildren<LoadingSpinnerProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LoadingSpinnerProps>>;
  return (
    <LoadingSpinnerContainer style={props.style}>
      <LoadingSpinnerOverlay $loading={props.loading}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: props.iconSize }} spin />}></Spin>
      </LoadingSpinnerOverlay>
      {props.children}
    </LoadingSpinnerContainer>
  );
}
