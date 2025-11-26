import React, { type ReactElement } from "react";

import BackdropSettings from "src/components/Tabs/Settings/BackdropSettings";
import { useViewerStateStore } from "src/state/ViewerState";
import { StyledHorizontalRule } from "src/styles/components";
import { FlexColumn } from "src/styles/utils";

import ChannelSettingsControl from "./ChannelSettingsControl";
import ObjectSettings from "./ObjectSettings";
import TrackPathSettings from "./TrackPathSettings";
import VectorFieldSettings from "./VectorFieldSettings";
import ViewportSettings from "./ViewportSettings";

export default function SettingsTab(): ReactElement {
  // State accessors
  const dataset = useViewerStateStore((state) => state.dataset);
  const isDataset3d = dataset?.has3dFrames() ?? false;

  return (
    <FlexColumn $gap={4}>
      <StyledHorizontalRule />

      <ViewportSettings isDataset3d={isDataset3d} />
      <StyledHorizontalRule />

      <ObjectSettings />
      <StyledHorizontalRule />

      <TrackPathSettings />
      <StyledHorizontalRule />

      {isDataset3d ? <ChannelSettingsControl /> : <BackdropSettings />}
      <StyledHorizontalRule />

      <VectorFieldSettings />

      {/* Extra padding to prevent layout shift when toggling open/closed */}
      <div style={{ height: "400px" }}></div>
    </FlexColumn>
  );
}
