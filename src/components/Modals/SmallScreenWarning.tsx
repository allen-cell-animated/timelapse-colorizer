import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, Checkbox } from "antd";
import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

import { FlexColumn, FlexRow } from "../../styles/utils";

import StyledModal from "./StyledModal";

const STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING = "allowSmallScreenWarning";
const ICON_SIZE_PX = 22;
const ICON_MARGIN_PX = 12;

type SmallScreenWarningProps = {
  minWidthPx?: number;
};
const defaultProps: Partial<SmallScreenWarningProps> = {
  minWidthPx: 768,
};

export default function SmallScreenWarning(inputProps: SmallScreenWarningProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SmallScreenWarningProps>;

  const [showModal, setShowModal] = useState(false);
  // Separately track whether the user is below the threshold.
  // Only show the modal again once the page is resized to be above the threshold width.
  const [isBelowThreshold, setIsBelowThreshold] = useState(false);
  const [allowWarning, setAllowWarning] = useLocalStorage(STORAGE_KEY_ALLOW_SMALL_SCREEN_WARNING, true);

  const checkScreenSize = useCallback((): void => {
    const shouldShowModal = window.innerWidth < props.minWidthPx && allowWarning;

    if (shouldShowModal && !isBelowThreshold) {
      // Trigger modal
      setShowModal(true);
      setIsBelowThreshold(true);
    } else if (!shouldShowModal && isBelowThreshold) {
      // Reset
      setShowModal(false);
      setIsBelowThreshold(false);
    }
  }, [props.minWidthPx, allowWarning, isBelowThreshold]);

  useEffect(() => {
    // Check on initial load and on resize
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, [checkScreenSize]);

  const title = (
    // Right margin prevents text from overflowing into where 'X' icon is
    <FlexRow $gap={ICON_MARGIN_PX} style={{ marginRight: "20px", alignItems: "flex-start" }}>
      <InfoCircleOutlined
        style={{ color: "var(--color-text-theme)", fontSize: ICON_SIZE_PX + "px", marginTop: "2.5px" }}
      />
      <span>This app is not optimized for use on small screens.</span>
    </FlexRow>
  );

  return (
    <StyledModal
      title={title}
      open={showModal}
      centered
      width={416}
      onCancel={() => setShowModal(false)}
      footer={() => (
        <Button type="primary" onClick={() => setShowModal(false)}>
          Ok
        </Button>
      )}
    >
      {/* Add margin to left to match the icon styling */}
      <FlexColumn $gap={10} style={{ marginLeft: ICON_SIZE_PX + ICON_MARGIN_PX + "px" }}>
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
    </StyledModal>
  );
}
