import { InfoCircleOutlined } from "@ant-design/icons";
import { Checkbox, Modal } from "antd";
import React, { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

import { FlexColumn } from "../../styles/utils";

import { useStyledModal } from "./StyledModal";

const STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING = "allowSmallScreenWarning";

type SmallScreenWarningProps = {
  minWidthPx?: number;
};
const defaultProps: Partial<SmallScreenWarningProps> = {
  minWidthPx: 768,
};

export default function SmallScreenWarning(inputProps: SmallScreenWarningProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SmallScreenWarningProps>;

  // This class has to do a lot of extra work because Ant Modal component doesn't have a convenient way to add icons.
  // Instead, we have to use the static Modal API (through `useStyledModal`) and then manipulate it to update with
  // state like a component.

  // `isShowingModal` is required to prevent the modal from being rendered during  in the `useEffect` hook.
  const isShowingModal = useRef(false);
  const [currentModal, setCurrentModal] = useState<ReturnType<typeof Modal.info> | null>(null);
  const [allowWarning, setAllowWarning] = useLocalStorage(STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING, true);

  const modal = useStyledModal();

  const checkScreenSize = useCallback((): void => {
    const shouldShowModal = window.innerWidth < props.minWidthPx;

    // Toggle between showing and hiding the modal
    if (shouldShowModal && !isShowingModal.current && allowWarning) {
      isShowingModal.current = true;
      setCurrentModal(modal.info({}));
    } else if (!shouldShowModal && isShowingModal.current) {
      isShowingModal.current = false;
      currentModal?.destroy();
      setCurrentModal(null);
    }
  }, [props.minWidthPx, allowWarning, currentModal]);

  useEffect(() => {
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, [checkScreenSize]);

  // Update render for the modal
  if (currentModal !== null) {
    currentModal.update({
      title: "This app is not optimized for use on small screens",
      content: (
        <FlexColumn $gap={10}>
          <p>For optimal experience, please try with a minimum screen width of {props.minWidthPx}px.</p>
          <Checkbox
            checked={!allowWarning}
            onChange={() => {
              setAllowWarning(!allowWarning);
            }}
          >
            Don&apos;t show this message again
          </Checkbox>
        </FlexColumn>
      ),
      maskClosable: true,
      onCancel: currentModal.destroy,
      onOk: currentModal.destroy,
      okText: "Ok",
      icon: <InfoCircleOutlined style={{ color: "var(--color-text-theme)" }} />,
      centered: true,
    });
  }

  return <></>;
}
