import React, { ReactElement, ReactNode, useContext } from "react";

import { TabType } from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { VisuallyHidden } from "../../styles/utils";
import { makeLinkStyleButton } from "./utils";

import { AppThemeContext } from "../AppStyle";
import { ImageToggleButton } from "../Buttons/ImageToggleButton";

export default function BackdropToggleButton(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);

  // Tooltip shows current backdrop + link to viewer settings
  const backdropTooltipContents: ReactNode[] = [];
  backdropTooltipContents.push(
    <span key="backdrop-name">
      {backdropKey === null ? "(No backdrops available)" : dataset?.getBackdropData().get(backdropKey)?.name}
    </span>
  );
  backdropTooltipContents.push(
    makeLinkStyleButton(
      theme,
      "backdrop-viewer-settings-link",
      () => setOpenTab(TabType.SETTINGS),
      <span>
        {"Viewer settings > Backdrop"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
      </span>
    )
  );

  return (
    <ImageToggleButton
      visible={backdropVisible}
      label={"backdrop"}
      tooltipContents={backdropTooltipContents}
      disabled={dataset === null || backdropKey === null}
      setVisible={setBackdropVisible}
    />
  );
}
