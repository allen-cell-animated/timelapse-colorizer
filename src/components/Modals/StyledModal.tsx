import { App, ModalFuncProps, ModalProps } from "antd";
import { useAppProps } from "antd/es/app/context";
import Modal from "antd/es/modal/Modal";
import React, { PropsWithChildren, ReactElement, useContext } from "react";

import { DocumentContext } from "../AppStyle";

type AntModalApi = useAppProps["modal"];
type AntModalApiFunction = AntModalApi["info"];
// The Ant Modal API functions return a tuple with `destroy` and `update` callbacks.
// Get the type of the update method's arguments, so we can wrap it.
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
const wrapStaticModalFunction = (
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
 *   // before: const { modal } = App.useApp();
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
    confirm: wrapStaticModalFunction(modalContainerRef, modal.confirm),
    info: wrapStaticModalFunction(modalContainerRef, modal.info),
    success: wrapStaticModalFunction(modalContainerRef, modal.success),
    error: wrapStaticModalFunction(modalContainerRef, modal.error),
    warning: wrapStaticModalFunction(modalContainerRef, modal.warning),
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
