import FeatureThresholdsTab from "./FeatureThresholdsTab";
import PlotTab from "./PlotTab";
import ScatterPlotTab from "./ScatterPlotTab";
import SettingsTab from "./SettingsTab";

enum TabType {
  FILTERS = "filters",
  TRACK_PLOT = "track_plot",
  SCATTER_PLOT = "scatter_plot",
  SETTINGS = "settings",
}

export { FeatureThresholdsTab, PlotTab, ScatterPlotTab, SettingsTab, TabType };
