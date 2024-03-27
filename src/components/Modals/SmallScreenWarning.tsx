import { Button, Checkbox, Modal } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

import { FlexColumn } from "../../styles/utils";

import { DocumentContext } from "../AppStyle";

const STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING = "allowSmallScreenWarning";

type SmallScreenWarningProps = {
  minWidthPx?: number;
};
const defaultProps: Partial<SmallScreenWarningProps> = {
  minWidthPx: 768,
};

export default function SmallScreenWarning(inputProps: SmallScreenWarningProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SmallScreenWarningProps>;

  const [showModal, setShowModal] = useState(false);
  const [allowWarning, setAllowWarning] = useLocalStorage(STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING, true);
  const { modalContainerRef } = useContext(DocumentContext);

  const checkScreenSize = useCallback((): void => {
    setShowModal(window.innerWidth < props.minWidthPx && allowWarning);
  }, [props.minWidthPx, allowWarning]);

  useEffect(() => {
    console.log("Added event listener");
    window.addEventListener("resize", checkScreenSize);
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, [checkScreenSize]);

  return (
    <Modal
      open={showModal}
      onCancel={() => {
        setShowModal(false);
      }}
      getContainer={modalContainerRef || undefined}
      footer={
        <Button onClick={() => setShowModal(false)} type="primary">
          Ok
        </Button>
      }
      centered={true}
      title="This app is not optimized for use on small screens"
      modalRender={(node) => {
        return <div>{node}</div>;
      }}
      style={{ maxWidth: "min(calc(100vw - 30px), 360px)" }}
    >
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
    </Modal>
  );
}
