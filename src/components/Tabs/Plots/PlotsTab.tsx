import React, { type ReactElement, useMemo } from "react";

import { PlotTabType, TabType } from "src/colorizer";
import type { ShowAlertBannerCallback } from "src/components/Banner";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import CorrelationPlotTab from "src/components/Tabs/CorrelationPlot/CorrelationPlotTab";
import LineageTab from "src/components/Tabs/Lineage/LineageTab";
import Plot3dTab from "src/components/Tabs/Plot3d/Plot3dTab";
import ScatterPlotTab from "src/components/Tabs/ScatterPlot/ScatterPlotTab";
import PlotTab from "src/components/Tabs/TrackPlot/PlotTab";
import { useViewerStateStore } from "src/state/ViewerState";

import type { SharedPlotTabProps } from "./types";

type PlotsTabProps = {
  className: string;
  showAlert: ShowAlertBannerCallback;
  disableUi: boolean;
  tabsContainerRef: React.RefObject<HTMLDivElement>;
};

export default function PlotsTab(props: PlotsTabProps): ReactElement {
  const openTab = useViewerStateStore((state) => state.openTab);
  const plotTab = useViewerStateStore((state) => state.plotTab);
  const setPlotTab = useViewerStateStore((state) => state.setPlotTab);
  const dataset = useViewerStateStore((state) => state.dataset);

  const { className, showAlert, disableUi, tabsContainerRef } = props;

  const hasLineageData = dataset && dataset.hasLineageData(dataset.getDefaultTrackKey() ?? "");

  const selectionItems = useMemo(() => {
    const items: SelectItem<PlotTabType>[] = [
      {
        label: "Track plot",
        value: PlotTabType.TRACK_PLOT,
        tooltip: "Plots feature values for selected tracks over time.",
      },
      {
        label: "Scatter plot",
        value: PlotTabType.SCATTER_PLOT,
        tooltip: "Plots all objects, with any feature as the X and Y axis.",
      },
      {
        label: "Correlation plot",
        value: PlotTabType.CORRELATION_PLOT,
        tooltip: "Calculates correlation scores between features.",
      },
      {
        label: "Flow field plot",
        value: PlotTabType.PLOT_3D,
        tooltip: "Calculates a 3D vector flow field for any three features.",
      },
    ];
    if (hasLineageData || plotTab === PlotTabType.LINEAGE) {
      items.push({
        label: "Lineage graph",
        value: PlotTabType.LINEAGE,
        tooltip: "Graphs parent-child relationships between tracks.",
      });
    }
    return items;
  }, [hasLineageData, plotTab]);

  const toolbar = useMemo(
    () => (
      <div style={{ width: "fit-content" }}>
        <SelectionDropdown
          label="Type"
          buttonType="primary"
          selected={plotTab}
          items={selectionItems}
          onChange={setPlotTab}
          controlWidth="150px"
          showSelectedItemTooltip={false}
        />
      </div>
    ),
    [plotTab, setPlotTab, selectionItems]
  );
  const sharedProps: SharedPlotTabProps = useMemo(
    () => ({
      toolbar,
    }),
    [toolbar]
  );

  const plotTabTypeToComponent = {
    [PlotTabType.TRACK_PLOT]: <PlotTab disabled={disableUi} {...sharedProps} />,
    [PlotTabType.SCATTER_PLOT]: (
      <ScatterPlotTab
        isVisible={openTab === TabType.DATA && plotTab === PlotTabType.SCATTER_PLOT}
        showAlert={showAlert}
        containerRef={tabsContainerRef.current ?? undefined}
        {...sharedProps}
      />
    ),
    [PlotTabType.PLOT_3D]: <Plot3dTab {...sharedProps} />,
    [PlotTabType.CORRELATION_PLOT]: <CorrelationPlotTab {...sharedProps} />,
    [PlotTabType.LINEAGE]: <LineageTab {...sharedProps} />,
  };

  return <div className={className}>{plotTabTypeToComponent[plotTab]}</div>;
}
