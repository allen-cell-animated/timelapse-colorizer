import React, { type ReactElement, useMemo } from "react";

import { DataTabType, TabType } from "src/colorizer";
import type { ShowAlertBannerCallback } from "src/components/Banner";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import CorrelationPlotTab from "src/components/Tabs/CorrelationPlot/CorrelationPlotTab";
import LineageTab from "src/components/Tabs/Lineage/LineageTab";
import Plot3dTab from "src/components/Tabs/Plot3d/Plot3dTab";
import ScatterPlotTab from "src/components/Tabs/ScatterPlot/ScatterPlotTab";
import PlotTab from "src/components/Tabs/TrackPlot/PlotTab";
import { useViewerStateStore } from "src/state/ViewerState";

import type { SharedDataTabProps } from "./types";

type DataTabProps = {
  className: string;
  showAlert: ShowAlertBannerCallback;
  disableUi: boolean;
  tabsContainerRef: React.RefObject<HTMLDivElement>;
};

export default function DataTab(props: DataTabProps): ReactElement {
  const openTab = useViewerStateStore((state) => state.openTab);
  const dataTab = useViewerStateStore((state) => state.dataTab);
  const setDataTab = useViewerStateStore((state) => state.setDataTab);
  const dataset = useViewerStateStore((state) => state.dataset);

  const { className, showAlert, disableUi, tabsContainerRef } = props;

  const hasLineageData = dataset && dataset.hasLineageData(dataset.getDefaultTrackKey() ?? "");

  const selectionItems = useMemo(() => {
    const items: SelectItem<DataTabType>[] = [
      {
        label: "Track plot",
        value: DataTabType.TRACK_PLOT,
        tooltip: "Plots feature values for selected tracks over time.",
      },
      {
        label: "Scatter plot",
        value: DataTabType.SCATTER_PLOT,
        tooltip: "Plots all objects, with any feature as the X and Y axis.",
      },
      {
        label: "Correlation plot",
        value: DataTabType.CORRELATION_PLOT,
        tooltip: "Calculates correlation scores between features.",
      },
      {
        label: "Flow field plot",
        value: DataTabType.PLOT_3D,
        tooltip: "Calculates a 3D vector flow field for any three features.",
      },
    ];
    if (hasLineageData || dataTab === DataTabType.LINEAGE) {
      items.push({ label: "Lineage", value: DataTabType.LINEAGE });
    }
    return items;
  }, [hasLineageData, dataTab]);

  const toolbar = useMemo(
    () => (
      <div>
        <SelectionDropdown
          selected={dataTab}
          items={selectionItems}
          onChange={setDataTab}
          width="150px"
          controlWidth="150px"
          showSelectedItemTooltip={false}
        />
      </div>
    ),
    [dataTab, setDataTab, selectionItems]
  );
  const sharedProps: SharedDataTabProps = useMemo(
    () => ({
      toolbar,
    }),
    [toolbar]
  );

  const dataTabToComponent = {
    [DataTabType.TRACK_PLOT]: <PlotTab disabled={disableUi} {...sharedProps} />,
    [DataTabType.SCATTER_PLOT]: (
      <ScatterPlotTab
        isVisible={openTab === TabType.DATA && dataTab === DataTabType.SCATTER_PLOT}
        showAlert={showAlert}
        containerRef={tabsContainerRef.current ?? undefined}
        {...sharedProps}
      />
    ),
    [DataTabType.PLOT_3D]: <Plot3dTab {...sharedProps} />,
    [DataTabType.CORRELATION_PLOT]: <CorrelationPlotTab {...sharedProps} />,
    [DataTabType.LINEAGE]: <LineageTab {...sharedProps} />,
  };

  return <div className={className}>{dataTabToComponent[dataTab]}</div>;
}
