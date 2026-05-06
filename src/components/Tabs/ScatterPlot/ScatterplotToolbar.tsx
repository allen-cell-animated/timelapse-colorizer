import { CloseOutlined, HomeOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement } from "react";

import IconButton from "src/components/Buttons/IconButton";
import { useViewerStateStore } from "src/state";
import { FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";

type ScatterplotToolbarProps = {
  onClickResetZoom: () => void;
  onClickClearTracks: () => void;
};

export default function ScatterplotToolbar(props: ScatterplotToolbarProps): ReactElement {
  const tracks = useViewerStateStore((state) => state.tracks);

  const hasTracks = tracks.size > 0;

  return (
    <FlexRowAlignCenter style={{ height: "fit-content" }} $gap={4}>
      <Tooltip title={"Reset zoom"} placement="top" trigger={["hover", "focus"]}>
        <IconButton onClick={props.onClickResetZoom} type="link">
          <HomeOutlined />
          <VisuallyHidden>Reset zoom</VisuallyHidden>
        </IconButton>
      </Tooltip>
      <Tooltip title={"Clear tracks"} placement="top" trigger={["hover", "focus"]}>
        <IconButton onClick={props.onClickClearTracks} type="link" disabled={!hasTracks}>
          <CloseOutlined />
          <VisuallyHidden>Clear tracks</VisuallyHidden>
        </IconButton>
      </Tooltip>
    </FlexRowAlignCenter>
  );
}
