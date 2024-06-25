import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";
import styled, { css } from "styled-components";

import { FlexColumnAlignCenter } from "../styles/utils";

type LoadingSpinnerProps = {
  loading: boolean;
  iconSize?: number;
  loadingText?: string;
  style?: React.CSSProperties;
};

const defaultProps: Partial<LoadingSpinnerProps> = {
  iconSize: 48,
  style: {},
};

const LoadingSpinnerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  h4 {
    font-style: normal;
    font-weight: 400;
    /* color: var(--color-text-theme-dark); */
  }
`;

const LoadingSpinnerOverlay = styled.div<{ $loading: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
  background-color: #00000040;
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

/**
 * Applies a loading spinner overlay on the provided children, which can be toggled on and off via props.
 */
export default function LoadingSpinner(inputProps: PropsWithChildren<LoadingSpinnerProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<LoadingSpinnerProps>>;
  return (
    <LoadingSpinnerContainer style={props.style}>
      <LoadingSpinnerOverlay $loading={props.loading}>
        <FlexColumnAlignCenter $gap={10}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: props.iconSize }} spin />}></Spin>
          {props.loadingText && <h4>{props.loadingText}</h4>}
        </FlexColumnAlignCenter>
      </LoadingSpinnerOverlay>
      {props.children}
    </LoadingSpinnerContainer>
  );
}
