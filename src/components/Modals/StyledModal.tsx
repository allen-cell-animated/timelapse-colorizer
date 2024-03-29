import { ModalProps } from "antd";
import Modal from "antd/es/modal/Modal";
import React, { PropsWithChildren, ReactElement, useContext } from "react";

import { DocumentContext } from "../AppStyle";

/**
 * Wrapper around Antd's Modal component, fixing a bug where modals are placed outside of
 * styling rules. Must be placed within an `AppStyle` component.
 */
export default function StyledModal(props: PropsWithChildren<ModalProps>): ReactElement {
  const { modalContainerRef } = useContext(DocumentContext);

  const newProps = { ...props };
  if (!newProps.getContainer) {
    newProps.getContainer = modalContainerRef || undefined;
  }

  return <Modal {...newProps}>{newProps.children}</Modal>;
}