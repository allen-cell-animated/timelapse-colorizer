import { Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";

import { ColorRamp, ColorRampType, isThresholdNumeric } from "../../../colorizer";
import { thresholdMatchFinder } from "../../../colorizer/utils/data_utils";
import { useViewerStateStore } from "../../../state";

import LabeledSlider from "../../Inputs/LabeledSlider";

type ColorRampRangeSliderProps = {
  disabled: boolean;
};

function getTrackCssGradient(
  min: number,
  max: number,
  minRange: number,
  maxRange: number,
  colorRamp: ColorRamp
): string {
  // When `max > maxRange` or `min < minRange`, the gradient stops will be
  // outside of the [0, 100] range. This is intentional, because it allows the
  // gradient to stretch past the bounds of physical color ramp control.
  const tMin = Math.min(((min - minRange) / (maxRange - minRange)) * 100, 0);
  const tMax = Math.max(((max - minRange) / (maxRange - minRange)) * 100, 100);
  const colorStops = colorRamp.colorStops;

  const stops: [string, number][] = [];
  const stepSize = (tMax - tMin) / (colorStops.length - 1);
  for (let i = 0; i < colorStops.length; i++) {
    const position = tMin + stepSize * i;
    stops.push(["#" + colorStops[i].getHexString(), position]);
  }
  return `linear-gradient(to right, ${stops.map(([color, pos]) => `${color} ${pos}%`).join(", ")})`;
}

function getRailCssGradient(
  min: number,
  max: number,
  minRange: number,
  maxRange: number,
  colorRamp: ColorRamp
): string {
  const tMin = ((min - minRange) / (maxRange - minRange)) * 100;
  const tMax = ((max - minRange) / (maxRange - minRange)) * 100;
  const colorStops = colorRamp.colorStops;
  const firstStop = colorStops[0];
  const lastStop = colorStops[colorStops.length - 1];
  return `linear-gradient(to right, #${firstStop.getHexString()} ${tMin}%, #${lastStop.getHexString()} ${tMax}%)`;
}

export default function ColorRampRangeSlider(props: ColorRampRangeSliderProps): ReactElement {
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const colorRamp = useViewerStateStore((state) => state.colorRamp);
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);

  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);

  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const marks = useMemo((): undefined | number[] => {
    if (dataset === null || featureKey === null || featureThresholds.length === 0) {
      return undefined;
    }
    const featureData = dataset.getFeatureData(featureKey);
    if (!featureData) {
      return undefined;
    }
    const threshold = featureThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
    if (!threshold || !isThresholdNumeric(threshold)) {
      return undefined;
    }
    return [threshold.min, threshold.max];
  }, [dataset, featureKey, featureThresholds]);

  const isUsingGlasbeyRamp = colorRamp.type === ColorRampType.CATEGORICAL;

  const minBound = featureKey !== null ? dataset?.getFeatureData(featureKey)?.min : undefined;
  const maxBound = featureKey !== null ? dataset?.getFeatureData(featureKey)?.max : undefined;
  const bgGradient = useMemo(
    () =>
      getTrackCssGradient(colorRampMin, colorRampMax, minBound ?? colorRampMin, maxBound ?? colorRampMax, colorRamp),
    [colorRampMin, colorRampMax, minBound, maxBound, colorRamp]
  );
  const trackGradient = useMemo(
    () => getRailCssGradient(colorRampMin, colorRampMax, minBound ?? colorRampMin, maxBound ?? colorRampMax, colorRamp),
    [colorRampMin, colorRampMax, minBound, maxBound, colorRamp]
  );

  return (
    <Tooltip
      trigger={["hover", "focus"]}
      title={isUsingGlasbeyRamp ? "Color ramp adjustment is disabled when a Glasbey color map is selected." : undefined}
    >
      <div style={{ width: "100%" }}>
        <LabeledSlider
          type="range"
          min={colorRampMin}
          max={colorRampMax}
          minSliderBound={minBound}
          maxSliderBound={maxBound}
          onChange={function (min: number, max: number): void {
            setColorRampRange([min, max]);
          }}
          marks={marks}
          disabled={props.disabled || isUsingGlasbeyRamp}
          sliderStyles={
            isUsingGlasbeyRamp
              ? undefined
              : {
                  track: {
                    background: "transparent",
                  },
                  tracks: {
                    background: bgGradient,
                  },
                  rail: {
                    background: trackGradient,
                  },
                }
          }
        />
      </div>
    </Tooltip>
  );
}
