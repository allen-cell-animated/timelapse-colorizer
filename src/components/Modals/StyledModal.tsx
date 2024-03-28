import { App, ModalFuncProps, ModalProps } from "antd";
import { useAppProps } from "antd/es/app/context";
import Modal from "antd/es/modal/Modal";
import React, { PropsWithChildren, ReactElement, useContext } from "react";

import { DocumentContext } from "../AppStyle";

type AppModal = useAppProps["modal"];
type StaticModalFunction = useAppProps["modal"]["info"];
// Extract parameter types from update method
type StaticModalUpdateProps = Parameters<ReturnType<StaticModalFunction>["update"]>[0];

/**
 * Injects a modal container into the updater props if `getContainer` doesn't exist.
 * Handles case where prop can either be an update method or an object.
 */
const addContainerToUpdaterProps = (
  modalContainerRef: HTMLDivElement | null,
  props: StaticModalUpdateProps
): StaticModalUpdateProps => {
  // Props can either be an object or a function that takes in the old object and returns a new one
  if (props instanceof Function) {
    // Wrap the function
    const propFunction = props; // Rename for clarity
    return (oldProps) => {
      const updatedProps = propFunction(oldProps);
      if (!updatedProps.getContainer) {
        return { ...updatedProps, getContainer: modalContainerRef || undefined };
      }
      return updatedProps;
    };
  } else {
    const newProps = { ...props };
    if (!newProps.getContainer) {
      newProps.getContainer = modalContainerRef || undefined;
    }
    return newProps;
  }
};

/**
 * Wraps Ant's static modal functions and injects the modal container ref into the props for both
 * the function and its returned updater method.
 */
const wrappedStaticModalFunctionFactory = (
  modalContainerRef: HTMLDivElement | null,
  modalFunction: StaticModalFunction
): StaticModalFunction => {
  return (props: ModalFuncProps) => {
    const newProps = { ...props };
    if (!newProps.getContainer) {
      newProps.getContainer = modalContainerRef || undefined;
    }
    const { destroy, update } = modalFunction(newProps);
    const wrappedUpdate: typeof update = (props: StaticModalUpdateProps) => {
      return update(addContainerToUpdaterProps(modalContainerRef, props));
    };
    return { destroy, update: wrappedUpdate };
  };
};

/**
 * Drop-in replacement for Ant's static modal API (the `App.useApp().modal` hook).
 * Fixes a bug where modals are placed outside of styling rules by providing a default container.
 * Components that use this must be placed within an `AppStyle` component.
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
export const useStyledModal = (): AppModal => {
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
