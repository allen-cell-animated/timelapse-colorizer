import { App, ModalFuncProps, ModalProps } from "antd";
import { useAppProps } from "antd/es/app/context";
import Modal from "antd/es/modal/Modal";
import React, { PropsWithChildren, ReactElement, useContext } from "react";

import { DocumentContext } from "../AppStyle";

type AntModalApi = useAppProps["modal"];
type AntModalApiFunction = AntModalApi["info"];
// The Ant Modal API returns a tuple with a destroy method and an updater method.
// Get the type of the updater method's props, so we can wrap it.
type ModalUpdateMethodProps = Parameters<ReturnType<AntModalApiFunction>["update"]>[0];
type ContainerRef = HTMLDivElement | null;

const addContainerToModalProps = (modalContainerRef: ContainerRef, props: ModalFuncProps): ModalFuncProps => {
  const newProps = { ...props };
  if (!newProps.getContainer) {
    newProps.getContainer = modalContainerRef || undefined;
  }
  return newProps;
};

/**
 * Injects a modal container into the modal updater function's props if `getContainer` doesn't exist.
 * Handles case where the prop can either be an update method or an object.
 */
const addContainerToUpdateMethodProps = (
  modalContainerRef: ContainerRef,
  props: ModalUpdateMethodProps
): ModalUpdateMethodProps => {
  // Props can either be an object or a function that takes in the old object and returns a new one
  if (props instanceof Function) {
    const propFunction = props; // Rename for clarity
    // Wrap the function
    return (oldProps) => {
      return addContainerToModalProps(modalContainerRef, propFunction(oldProps));
    };
  }
  return addContainerToModalProps(modalContainerRef, props);
};

/**
 * Wrapper for Ant's static modal functions. The wrapper injects the modal container reference
 * into the props for both the static modal function and its returned updater method.
 */
const wrappedStaticModalFunctionFactory = (
  modalContainerRef: ContainerRef,
  modalFunction: AntModalApiFunction
): AntModalApiFunction => {
  return (props: ModalFuncProps) => {
    const newProps = addContainerToModalProps(modalContainerRef, props);
    const { destroy, update } = modalFunction(newProps);
    const wrappedUpdate: typeof update = (props: ModalUpdateMethodProps) => {
      return update(addContainerToUpdateMethodProps(modalContainerRef, props));
    };
    return { destroy, update: wrappedUpdate };
  };
};

/**
 * Drop-in replacement for Ant's static modal API (the `App.useApp().modal` hook).
 * Fixes a bug where modals are placed outside of styling rules by providing a default `getContainer`
 * prop if none is provided.
 * Components using this API must be placed within an `AppStyle` component.
 *
 * @example
 * ```
 * const MyButton = (): ReactElement => {
 *   const modal = useStyledModal();
 *   return <Button
 *      onClick={() => modal.info({title: "An info modal", content: "Some information here"})}
 *   >
 *      Open modal
 *   </Button>;
 * }
 *
 * export default MyButton;
 * ```
 */
export const useStyledModal = (): AntModalApi => {
  const { modalContainerRef } = useContext(DocumentContext);
  const { modal } = App.useApp();
  return {
    confirm: wrappedStaticModalFunctionFactory(modalContainerRef, modal.confirm),
    info: wrappedStaticModalFunctionFactory(modalContainerRef, modal.info),
    success: wrappedStaticModalFunctionFactory(modalContainerRef, modal.success),
    error: wrappedStaticModalFunctionFactory(modalContainerRef, modal.error),
    warning: wrappedStaticModalFunctionFactory(modalContainerRef, modal.warning),
  };
};

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
