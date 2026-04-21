import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, ReactNode } from "react";
import styled from "styled-components";

import { TagIconSVG, TagSlashIconSVG } from "src/assets";
import { TabType, ViewMode } from "src/colorizer/types";
import CanvasOverlay from "src/colorizer/viewport/CanvasOverlay";
import IconButton from "src/components/Buttons/IconButton";
import TooltipButtonStyleLink from "src/components/Buttons/TooltipButtonStyleLink";
import BackdropToggleButton from "src/components/CanvasWrapper/BackdropToggleButton";
import ChannelToggleButton from "src/components/CanvasWrapper/ChannelToggleButton";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import { AnnotationState } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn, VisuallyHidden } from "src/styles/utils";

type CanvasToolbarProps = {
  annotationState: AnnotationState;
  canv: CanvasOverlay;
};

const CanvasControlsContainer = styled(FlexColumn)`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px;
  border-radius: 4px;
  background-color: var(--color-viewport-overlay-background);
  border: 1px solid var(--color-viewport-overlay-outline);
`;

const SectionDivider = styled.hr`
  height: 1px;
  width: 100%;
  margin: 4px 0;
  border: none;
  background-color: var(--color-borders);
`;

export default function CanvasToolbar(props: CanvasToolbarProps): ReactElement {
  const { canv } = props;

  const viewMode = useViewerStateStore((state) => state.viewMode);
  const isDataset3d = viewMode === ViewMode.VIEW_3D;
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);

  const onAnnotationLinkClicked = (): void => {
    setOpenTab(TabType.ANNOTATION);
  };

  const labels = props.annotationState.data.getLabels();
  const annotationTooltipContents: ReactNode[] = [];
  annotationTooltipContents.push(
    <span key="annotation-count">
      {labels.length > 0 ? (labels.length === 1 ? "1 label" : `${labels.length} labels`) : "(No labels)"}
    </span>
  );
  annotationTooltipContents.push(
    <TooltipButtonStyleLink key="annotation-link" onClick={onAnnotationLinkClicked}>
      <span>
        View and edit annotations <VisuallyHidden>(opens annotations tab)</VisuallyHidden>
      </span>
    </TooltipButtonStyleLink>
  );

  return (
    <CanvasControlsContainer>
      <Tooltip title={"Reset view"} placement="right" trigger={["hover", "focus"]}>
        <IconButton
          onClick={() => {
            canv.resetView();
          }}
          type="link"
        >
          <HomeOutlined />
          <VisuallyHidden>Reset view</VisuallyHidden>
        </IconButton>
      </Tooltip>
      <TooltipWithSubtitle title={"Zoom in"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
        <IconButton
          type="link"
          onClick={() => {
            canv.handleZoomIn();
          }}
        >
          <ZoomInOutlined />
          <VisuallyHidden>Zoom in</VisuallyHidden>
        </IconButton>
      </TooltipWithSubtitle>
      <TooltipWithSubtitle title={"Zoom out"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
        <IconButton
          type="link"
          onClick={() => {
            canv.handleZoomOut();
          }}
        >
          <ZoomOutOutlined />
          <VisuallyHidden>Zoom out</VisuallyHidden>
        </IconButton>
      </TooltipWithSubtitle>

      <SectionDivider />

      {/* 2D backdrop or 3D channels toggle */}
      {isDataset3d ? <ChannelToggleButton /> : <BackdropToggleButton />}

      {/* Annotation mode toggle */}
      <TooltipWithSubtitle
        title={props.annotationState.visible ? "Hide annotations" : "Show annotations"}
        subtitleList={annotationTooltipContents}
        placement="right"
        trigger={["hover", "focus"]}
      >
        <IconButton
          type={props.annotationState.visible ? "primary" : "link"}
          onClick={() => {
            props.annotationState.setVisibility(!props.annotationState.visible);
          }}
        >
          {props.annotationState.visible ? <TagIconSVG /> : <TagSlashIconSVG />}
          <VisuallyHidden>{props.annotationState.visible ? "Hide annotations" : "Show annotations"}</VisuallyHidden>
        </IconButton>
      </TooltipWithSubtitle>
    </CanvasControlsContainer>
  );
}
