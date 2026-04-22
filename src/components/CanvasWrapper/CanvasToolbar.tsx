import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { type ReactElement, type ReactNode } from "react";
import styled from "styled-components";

import { ImageIconSVG, ImageSlashIconSVG, TagIconSVG, TagSlashIconSVG } from "src/assets";
import { TabType, ViewMode } from "src/colorizer/types";
import type CanvasOverlay from "src/colorizer/viewport/CanvasOverlay";
import IconButton from "src/components/Buttons/IconButton";
import TooltipButtonStyleLink from "src/components/Buttons/TooltipButtonStyleLink";
import BackdropToggleButton from "src/components/CanvasWrapper/BackdropToggleButton";
import CentroidsToggleButton from "src/components/CanvasWrapper/CentroidsToggleButton";
import ChannelToggleButton from "src/components/CanvasWrapper/ChannelToggleButton";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import type { AnnotationState } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn, VisuallyHidden } from "src/styles/utils";

type CanvasToolbarProps = {
  annotationState: AnnotationState;
  canv: CanvasOverlay;
  style?: React.CSSProperties;
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
  margin: 0;
  border: none;
  background-color: rgba(0, 0, 0, 0.2);
`;

export default function CanvasToolbar(props: CanvasToolbarProps): ReactElement {
  const { canv } = props;

  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setShowSegmentations = useViewerStateStore((state) => state.setShowSegmentations);
  const showSegmentations = useViewerStateStore((state) => state.showSegmentations);
  const viewMode = useViewerStateStore((state) => state.viewMode);

  const isDataset3d = viewMode === ViewMode.VIEW_3D;

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
    <CanvasControlsContainer $gap={4} style={props.style}>
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

      <TooltipWithSubtitle
        title={showSegmentations ? "Hide segmentations" : "Show segmentations"}
        placement="right"
        trigger={["hover", "focus"]}
      >
        <IconButton
          type={showSegmentations ? "primary" : "link"}
          onClick={() => setShowSegmentations(!showSegmentations)}
        >
          {showSegmentations ? <ImageIconSVG /> : <ImageSlashIconSVG />}
        </IconButton>
      </TooltipWithSubtitle>
      {/* 2D backdrop or 3D channels toggle */}
      {isDataset3d ? <ChannelToggleButton /> : <BackdropToggleButton />}

      {/* TODO: Remove flag when centroids are supported in 3D. */}
      {!isDataset3d && <CentroidsToggleButton />}

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
