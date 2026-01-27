import { Button } from "antd";
import React, { type ReactElement, useMemo } from "react";

import ShortcutKeyList from "src/components/Display/ShortcutKeyList";
import StyledModal from "src/components/Modals/StyledModal";
import { ShortcutKeyInfo } from "src/constants";
import { FlexColumn } from "src/styles/utils";
import { capitalizeFirstLetter } from "src/utils/formatting";

type ShortcutKeyModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  shortcuts: Record<string, Record<string, ShortcutKeyInfo>>;
};

export default function ShortcutKeyModal(props: ShortcutKeyModalProps): ReactElement {
  const shortcutDisplays = useMemo(
    () =>
      Object.entries(props.shortcuts).map(([sectionName, shortcutKeys]) => {
        return (
          <ShortcutKeyList key={sectionName} shortcutKeys={shortcutKeys} title={capitalizeFirstLetter(sectionName)} />
        );
      }),
    [props.shortcuts]
  );

  return (
    <StyledModal
      open={props.open}
      title="Keyboard shortcuts"
      centered
      onCancel={() => props.setOpen(false)}
      footer={<Button onClick={() => props.setOpen(false)}>Close</Button>}
    >
      <FlexColumn $gap={10}>{shortcutDisplays}</FlexColumn>
    </StyledModal>
  );
}
