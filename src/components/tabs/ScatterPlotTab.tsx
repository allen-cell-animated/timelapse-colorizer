import { Button, Tooltip } from "antd";
import { MenuItemType } from "antd/es/menu/hooks/useItems";
import { RetweetOutlined } from "@ant-design/icons";
import Plotly, { PlotData, PlotMarker } from "plotly.js-dist-min";
import React, {
  ReactElement,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import styled from "styled-components";

import { AppThemeContext } from "../AppStyle";
import { Dataset, Track } from "../../colorizer";
import { remap } from "../../colorizer/utils/math_utils";
import { useDebounce } from "../../colorizer/utils/react_utils";
import IconButton from "../IconButton";
import LabeledDropdown from "../LabeledDropdown";
import LoadingSpinner from "../LoadingSpinner";
import { FlexRowAlignCenter } from "../../styles/utils";

const FRAME_FEATURE = { key: "time", name: "Time" };

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

enum RangeType {
  ALL_TIME = "All time",
  CURRENT_TRACK = "Current track",
  CURRENT_FRAME = "Current frame",
}
const DEFAULT_RANGE_TYPE = RangeType.ALL_TIME;

type ScatterPlotTabProps = {
  dataset: Dataset | null;
  currentFrame: number;
  selectedTrack: Track | null;
  findTrack: (trackId: number, seekToFrame: boolean) => void;
  setFrame: (frame: number) => Promise<void>;
};
const defaultProps: Partial<ScatterPlotTabProps> = {};

const ScatterPlotContainer = styled.div`
  & canvas {
    border: 0px solid transparent !important;
  }
`;

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const theme = useContext(AppThemeContext);

  const [isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is async and does not stop the state update, so we need to track
  // completion with a separate flag.
  const [isRendering, setIsRendering] = useState(false);

  /** Maps from the point number to an object's ID in the dataset.
   * Null if the point number maps 1:1 to the dataset object ID.
   */
  const pointNumToObjectId = useRef<number[] | null>();

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Mount the plot to the DOM
    Plotly.newPlot(
      plotDivRef.current!,
      [],
      {
        autosize: true,
        xaxis: { title: xAxisFeatureName || "" },
        yaxis: { title: yAxisFeatureName || "" },
      },
      PLOTLY_CONFIG
    ).then((plot) => {
      // TODO: Add onHover event listener to lookup + show object ID and track ID

      plot.on("plotly_click", (eventData: any) => {
        // Add event listener
        if (eventData.points.length === 0) {
          return;
        }
        if (eventData.points[0].pointNumbers && eventData.points[0].pointNumbers.length > 0) {
          // User clicked on a histogram bar
          return;
        }
        if (!dataset) {
          return;
        }

        const point = eventData.points[0];
        let objectId;
        if (pointNumToObjectId.current === null) {
          console.log("Point number: " + point.pointNumber + "Object ID: " + point.pointNumber);
          objectId = point.pointNumber + 1;
        } else {
          console.log(
            "Point number: " + point.pointNumber + " Object ID: " + pointNumToObjectId.current![point.pointNumber] + 1
          );
          objectId = pointNumToObjectId.current![point.pointNumber];
        }
        const trackId = dataset.getTrackId(objectId);
        const frame = dataset.times ? dataset.times[objectId] : undefined;
        if (frame !== undefined) {
          props.findTrack(trackId, false);
          props.setFrame(frame);
        } else {
          // Jump to first frame where the track is valid
          props.findTrack(trackId, true);
        }
      });
    });
  }, [plotDivRef.current]);

  // Note: This does not actually prevent the dataset from blocking the UI thread, it just
  // delays the update slightly until after the dataset loads in so the block is not as noticeable.
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const propDataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  useMemo(() => {
    startTransition(() => {
      setDataset(propDataset);
    });
  }, [propDataset]);

  // TODO: Implement color ramps in a worker thread. This was originally removed for performance issues.
  // Plotly's performance can be improved by generating traces for colors rather than feeding it the raw
  // data and asking it to colorize it. This might be better in a worker?
  // https://www.somesolvedproblems.com/2020/03/improving-plotly-performance-coloring.html

  // Track last rendered props + state to make smart optimizations on re-renders

  type LastRenderedState = {
    xAxisFeatureName: string | null;
    yAxisFeatureName: string | null;
    rangeType: RangeType;
  } & ScatterPlotTabProps;

  const lastRenderedState = useRef<LastRenderedState>({
    xAxisFeatureName: null,
    yAxisFeatureName: null,
    rangeType: DEFAULT_RANGE_TYPE,
    ...props,
  });

  const [rangeType, _setRangeType] = useState<RangeType>(DEFAULT_RANGE_TYPE);
  const setRangeType = (newRangeType: RangeType): void => {
    if (newRangeType === rangeType) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setRangeType(newRangeType);
    });
  };

  const [xAxisFeatureName, _setXAxisFeatureName] = useState<string | null>(null);
  const setXAxisFeatureName = (newFeatureName: string | null): void => {
    if (newFeatureName === xAxisFeatureName) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setXAxisFeatureName(newFeatureName);
    });
  };
  const [yAxisFeatureName, _setYAxisFeatureName] = useState<string | null>(null);
  const setYAxisFeatureName = (newFeatureName: string | null): void => {
    if (newFeatureName === yAxisFeatureName) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setYAxisFeatureName(newFeatureName);
    });
  };

  const getData = useCallback(
    (featureName: string | null, dataset: Dataset | null): Uint32Array | Float32Array | string[] | null | undefined => {
      if (featureName === null || dataset === null) {
        return undefined;
      }

      if (featureName === FRAME_FEATURE.name) {
        return dataset.times;
      }

      const featureData = dataset.getFeatureData(featureName);
      if (!featureData) {
        return undefined;
      }

      if (dataset.isFeatureCategorical(featureName)) {
        // Map feature data to string categories
        const categories: string[] = dataset.getFeatureCategories(featureName) || [];
        return Array.from(dataset.getFeatureData(featureName)!.data).map((value) => {
          return categories[value];
        });
      }

      return dataset.getFeatureData(featureName)?.data;
    },
    []
  );

  //////////////////////////////////
  // Plot Updates
  //////////////////////////////////

  const getMarkerColor = (numMarkers: number, baseColor: string): string => {
    // Increase marker transparency as the number of markers increases.
    const opacity = remap(numMarkers, 0, 1000, 0.8, 0.25);

    return (
      baseColor +
      Math.floor(opacity * 255)
        .toString(16)
        .padStart(2, "0")
    );
  };

  useEffect(() => {
    const clearPlotAndStopRender = (): void => {
      Plotly.react(plotDivRef.current!, [], {}, PLOTLY_CONFIG);
      setIsRendering(false);
    };

    const lastState = lastRenderedState.current;

    const haveAxesChanged =
      lastState.xAxisFeatureName !== xAxisFeatureName || lastState.yAxisFeatureName !== yAxisFeatureName;
    const hasRangeChanged = lastState.rangeType !== rangeType;
    const hasTrackChanged = lastState.selectedTrack !== props.selectedTrack;
    const hasFrameChanged = lastState.currentFrame !== props.currentFrame;
    const hasDatasetChanged = lastState.dataset !== dataset;

    if (!haveAxesChanged && !hasRangeChanged && !hasDatasetChanged) {
      // Ignore changes to the current frame if we are not showing the current frame
      if (rangeType !== RangeType.CURRENT_FRAME && hasFrameChanged && !hasTrackChanged) {
        setIsRendering(false);
        return;
      }
      // Ignore changes to track if we are not showing by track
      if (rangeType !== RangeType.CURRENT_TRACK && hasTrackChanged && !hasFrameChanged) {
        setIsRendering(false);
        return;
      }
    }

    if (plotDivRef.current === null) {
      setIsRendering(false);
      return;
    }

    let xData = getData(xAxisFeatureName, dataset);
    let yData = getData(yAxisFeatureName, dataset);

    if (!xData || !yData || !xAxisFeatureName || !yAxisFeatureName) {
      clearPlotAndStopRender();
      return;
    }

    // Filter data by range, if applicable
    if (rangeType === RangeType.CURRENT_FRAME) {
      if (!dataset?.times) {
        clearPlotAndStopRender();
        return;
      }
      pointNumToObjectId.current = [];
      for (let i = 0; i < dataset.times.length; i++) {
        if (dataset.times[i] === props.currentFrame) {
          pointNumToObjectId.current.push(i);
        }
      }
      xData = xData.filter((_value, index) => dataset?.times && dataset?.times[index] === props.currentFrame);
      yData = yData.filter((_value, index) => dataset?.times && dataset?.times[index] === props.currentFrame);
    } else if (rangeType === RangeType.CURRENT_TRACK) {
      if (!props.selectedTrack) {
        clearPlotAndStopRender();
        return;
      }
      // TODO: Optimize by turning this into a for loop over the selected track's id's.
      const trackIds = new Set(props.selectedTrack.ids);
      xData = xData.filter((_value, index) => trackIds.has(index));
      yData = yData.filter((_value, index) => trackIds.has(index));
      pointNumToObjectId.current = Array.from(props.selectedTrack.ids);
    } else {
      // All time
      pointNumToObjectId.current = null;
    }

    const markerConfig: Partial<PlotMarker> = {
      color: getMarkerColor(xData.length, theme.color.themeDark),
      size: 4,
    };

    // Configure traces for Plotly
    const markerTrace: Partial<PlotData> = {
      x: xData,
      y: yData,
      text: Array.from(dataset?.trackIds || []).map((number) => number.toString()),
      name: "",
      type: "scattergl",
      mode: "markers",
      marker: markerConfig,
      hovertemplate:
        `${xAxisFeatureName}: %{x} ${dataset?.getFeatureUnits(xAxisFeatureName)}` +
        `<br>${yAxisFeatureName}: %{y} ${dataset?.getFeatureUnits(yAxisFeatureName)}` +
        `<extra>Track ID: %{text}` +
        `<br>Object ID: %{pointNumber}</extra>`,
    };
    var xDensityTrace: Partial<PlotData> = {
      x: xData,
      name: "x density",
      marker: { color: theme.color.themeLight },
      yaxis: "y2",
      type: "histogram",
    };
    var yDensityTrace: Partial<PlotData> = {
      y: yData,
      name: "y density",
      marker: { color: theme.color.themeLight },
      xaxis: "x2",
      type: "histogram",
    };

    const estimateTextWidthPxForCategories = (): number => {
      if (yAxisFeatureName === null || !dataset?.isFeatureCategorical(yAxisFeatureName)) {
        return 0;
      }
      const categories = dataset.getFeatureCategories(yAxisFeatureName) || [];
      return (
        categories.reduce((_prev, val, acc) => {
          return Math.max(val.length, acc);
        }, 0) * 10
      );
    };

    // TODO: Show categories as box and whisker plots?

    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories());

    Plotly.react(
      plotDivRef.current,
      [markerTrace, xDensityTrace, yDensityTrace],
      {
        autosize: true,
        showlegend: false,
        xaxis: {
          title: dataset?.getFeatureNameWithUnits(xAxisFeatureName || ""),
          domain: [0, 0.8],
          showgrid: false,
          zeroline: true,
        },
        yaxis: {
          title: dataset?.getFeatureNameWithUnits(yAxisFeatureName || ""),
          domain: [0, 0.8],
          showgrid: false,
          zeroline: true,
        },
        xaxis2: { domain: [0.85, 1], showgrid: false, zeroline: true },
        yaxis2: { domain: [0.85, 1], showgrid: false, zeroline: true },
        margin: { l: leftMarginPx, r: 50, b: 50, t: 20, pad: 4 },
        font: {
          // Unfortunately using the Lato font family causes the text to render with SEVERE
          // aliasing. Using the default plotly font family causes the X and Y axes to be
          // two different fonts, but it's better than using Lato.
          // Possible workarounds include converting the Lato TTF to an SVG font.
          // family: theme.font.family,
          size: 12,
        },
      },
      PLOTLY_CONFIG
    ).then(() => {
      setIsRendering(false);
      lastRenderedState.current = {
        xAxisFeatureName,
        yAxisFeatureName,
        rangeType,
        ...props,
      };
    });
  }, [plotDivRef.current, dataset, xAxisFeatureName, yAxisFeatureName, rangeType, props.currentFrame, props.selectedTrack]);

  //////////////////////////////////
  // Rendering
  //////////////////////////////////

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  const menuItems: MenuItemType[] = featureNames.map((name) => {
    return { key: name, label: dataset?.getFeatureNameWithUnits(name) };
  });
  menuItems.push({ key: FRAME_FEATURE.name, label: FRAME_FEATURE.name });

  return (
    <>
      <FlexRowAlignCenter $gap={6} style={{ flexWrap: "wrap" }}>
        <LabeledDropdown
          label={"X:"}
          selected={xAxisFeatureName || ""}
          items={menuItems}
          onChange={setXAxisFeatureName}
        />
        <Tooltip title="Swap axes">
          <IconButton
            onClick={() => {
              setXAxisFeatureName(yAxisFeatureName);
              setYAxisFeatureName(xAxisFeatureName);
              setIsRendering(true);
            }}
            type="link"
          >
            <RetweetOutlined />
          </IconButton>
        </Tooltip>
        <LabeledDropdown
          label={"Y:"}
          selected={yAxisFeatureName || ""}
          items={menuItems}
          onChange={setYAxisFeatureName}
        />

        <LabeledDropdown
          label={"Show objects from:"}
          style={{ marginLeft: "10px" }}
          selected={rangeType}
          items={Object.values(RangeType)}
          width={"120px"}
          onChange={(value) => setRangeType(value as RangeType)}
        ></LabeledDropdown>
      </FlexRowAlignCenter>
      <div style={{ position: "relative" }}>
        <Button
          style={{ position: "absolute", right: "5px", top: "5px", zIndex: 10 }}
          onClick={() => {
            setXAxisFeatureName(null);
            setYAxisFeatureName(null);
            setIsRendering(true);
          }}
        >
          Clear
        </Button>
        <LoadingSpinner loading={isPending || isRendering} style={{ marginTop: "10px" }}>
          <ScatterPlotContainer
            style={{ width: "100%", height: "380px", padding: "5px" }}
            ref={plotDivRef}
          ></ScatterPlotContainer>
        </LoadingSpinner>
      </div>
    </>
  );
});
