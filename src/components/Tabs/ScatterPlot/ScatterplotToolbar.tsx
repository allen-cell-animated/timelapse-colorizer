import { DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { type ReactElement } from "react";

import { ResetViewIconSVG } from "src/assets";
import { PlotRangeType } from "src/colorizer/types";
import IconButton from "src/components/Buttons/IconButton";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import ToggleContoursButton from "src/components/Tabs/ScatterPlot/ToggleContoursButton";
import ToggleHistogramButton from "src/components/Tabs/ScatterPlot/ToggleHistogramButton";
import { useViewerStateStore } from "src/state";
import { StyledVerticalRule } from "src/styles/components";
import { FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";

type ScatterplotToolbarProps = {
  popupContainer?: HTMLElement;
  onClickResetZoom: () => void;
  onClickClearTracks: () => void;
  onClickDownloadCsv: () => void;
};

const PLOT_RANGE_SELECT_ITEMS = Object.values(PlotRangeType);

export default function ScatterplotToolbar(props: ScatterplotToolbarProps): ReactElement {
  const tracks = useViewerStateStore((state) => state.tracks);
  const scatterRangeType = useViewerStateStore((state) => state.scatterRangeType);
  const setRangeType = useViewerStateStore((state) => state.setScatterRangeType);

  const hasTracks = tracks.size > 0;

  return (
    <FlexRowAlignCenter style={{ height: "fit-content" }} $gap={4}>
      <div style={{ marginRight: "2px" }}>
        <SelectionDropdown
          label={"Show objects from"}
          hideLabel={true}
          selected={scatterRangeType}
          items={PLOT_RANGE_SELECT_ITEMS}
          controlWidth={"130px"}
          onChange={(value: string) => setRangeType(value as PlotRangeType)}
          showSelectedItemTooltip={false}
        ></SelectionDropdown>
      </div>

      <ToggleHistogramButton popupContainer={props.popupContainer} />

      <ToggleContoursButton popupContainer={props.popupContainer} />

      <StyledVerticalRule style={{ height: 24, margin: "0 4px" }} />

      <Tooltip title={"Reset zoom"} placement="top" trigger={["hover", "focus"]}>
        <IconButton onClick={props.onClickResetZoom} type="link">
          <ResetViewIconSVG />
          <VisuallyHidden>Reset zoom</VisuallyHidden>
        </IconButton>
      </Tooltip>

      <Tooltip title={"Download current scatterplot as CSV"} placement="top" trigger={["hover", "focus"]}>
        <IconButton onClick={props.onClickDownloadCsv} type="link">
          <DownloadOutlined />
          <VisuallyHidden>Download current scatterplot as CSV</VisuallyHidden>
        </IconButton>
      </Tooltip>

      <Tooltip title={"Clear tracks"} placement="top" trigger={["hover", "focus"]}>
        <IconButton onClick={props.onClickClearTracks} type="link" disabled={!hasTracks}>
          <DeleteOutlined />
          <VisuallyHidden>Clear tracks</VisuallyHidden>
        </IconButton>
      </Tooltip>
    </FlexRowAlignCenter>
  );
}
