import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";
import { inverseLerp } from "three/src/math/MathUtils";

import { ColorRamp, ColorRampType, isThresholdNumeric } from "../../../colorizer";
import { thresholdMatchFinder } from "../../../colorizer/utils/data_utils";
import { useViewerStateStore } from "../../../state";
import { FlexRowAlignCenter } from "../../../styles/utils";

import { FeatureType } from "../../../colorizer/Dataset";
import IconButton from "../../IconButton";
import LabeledSlider from "../../Inputs/LabeledSlider";

type ColorRampRangeSliderProps = {
  disabled: boolean;
};

/**
 * Creates a CSS gradient string for the slider track, between the two range
 * handles. `min` and `max` are the current range values, while `minRange` and
 * `maxRange` are the overall bounds of the slider.
 *
 * @returns A CSS gradient string, where 0% is at the slider's minimum handle
 * and 100% is at the slider's maximum handle. When `min` and/or `max` is
 * outside the slider's bounds, the gradient is extrapolated beyond 0% and/or
 * 100%.
 */
function getTrackCssGradient(
  min: number,
  max: number,
  minRange: number,
  maxRange: number,
  colorRamp: ColorRamp
): string {
  // Determine the step size between color stops, in percentage space.
  const range = max - min;
  const visibleRange = Math.min(max, maxRange) - Math.max(min, minRange);
  const scaleFactor = (range === 0 ? 1 : range / visibleRange) * 100;
  const stepSize = scaleFactor / (colorRamp.colorStops.length - 1);

  const minPercent = inverseLerp(Math.max(minRange, min), Math.min(max, maxRange), min) * 100;

  // Generate the CSS gradient string. Browsers will handle percentages outside
  // the 0-100% range.
  const colorStops = colorRamp.colorStops;
  const stops: [string, number][] = [];
  for (let i = 0; i < colorStops.length; i++) {
    const positionPercent = minPercent + stepSize * i;
    stops.push(["#" + colorStops[i].getHexString(), positionPercent]);
  }
  return `linear-gradient(to right, ${stops.map(([color, pos]) => `${color} ${pos}%`).join(", ")})`;
}

/**
 * Gets the CSS gradient for the rail, which is the region outside the selected
 * range.
 *
 * The range below the slider min is filled with the first color stop, and the
 * range above the slider max is filled with the last color stop.
 *
 * ```text
 * 0% ----o----------------o---- 100%
 *        ^ slider min     ^ slider max
 * ```
 */
function getRailCssGradient(
  min: number,
  max: number,
  minRange: number,
  maxRange: number,
  colorRamp: ColorRamp
): string {
  // Get the min and max positions as percentages of the full slider range. It's
  // OK if they are outside the 0-100% range, since the rail won't be visible in
  // that case anyways.
  const minPercent = ((min - minRange) / (maxRange - minRange)) * 100;
  const maxPercent = ((max - minRange) / (maxRange - minRange)) * 100;
  const colorStops = colorRamp.colorStops;
  const firstStop = colorStops[0];
  const lastStop = colorStops[colorStops.length - 1];
  return `linear-gradient(to right, #${firstStop.getHexString()} ${minPercent}%, #${lastStop.getHexString()} ${maxPercent}%)`;
}

export default function ColorRampRangeSlider(props: ColorRampRangeSliderProps): ReactElement {
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const colorRamp = useViewerStateStore((state) => state.colorRamp);
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);
  const keepColorRampRange = useViewerStateStore((state) => state.keepColorRampRange);
  const setKeepColorRampRange = useViewerStateStore((state) => state.setKeepColorRampRange);

  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);

  const featureData = featureKey !== null ? dataset?.getFeatureData(featureKey) : undefined;

  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const marks = useMemo((): undefined | number[] => {
    if (dataset === null || featureKey === null || featureThresholds.length === 0) {
      return undefined;
    }
    if (!featureData) {
      return undefined;
    }
    const threshold = featureThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
    if (!threshold || !isThresholdNumeric(threshold)) {
      return undefined;
    }
    return [threshold.min, threshold.max];
  }, [dataset, featureKey, featureThresholds, featureData]);

  const isUsingGlasbeyRamp = colorRamp.type === ColorRampType.CATEGORICAL;

  const minBound = featureData ? featureData?.min : undefined;
  const maxBound = featureData ? featureData?.max : undefined;
  const bgGradient = useMemo(
    () =>
      getTrackCssGradient(colorRampMin, colorRampMax, minBound ?? colorRampMin, maxBound ?? colorRampMax, colorRamp),
    [colorRampMin, colorRampMax, minBound, maxBound, colorRamp]
  );
  const trackGradient = useMemo(
    () => getRailCssGradient(colorRampMin, colorRampMax, minBound ?? colorRampMin, maxBound ?? colorRampMax, colorRamp),
    [colorRampMin, colorRampMax, minBound, maxBound, colorRamp]
  );

  const keepRangeButtonAltText =
    (keepColorRampRange ? "Reset" : "Keep") + " range when switching datasets and features";

  return (
    <Tooltip
      trigger={["hover", "focus"]}
      title={isUsingGlasbeyRamp ? "Color ramp adjustment is disabled when a Glasbey color map is selected." : undefined}
    >
      <FlexRowAlignCenter style={{ width: "100%" }} $gap={4}>
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
          showMidpoint={colorRamp.type === ColorRampType.DIVERGING}
          disabled={props.disabled || isUsingGlasbeyRamp}
          step={featureData?.type === FeatureType.DISCRETE ? 1 : undefined}
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
        <Tooltip title={keepRangeButtonAltText} trigger={["hover", "focus"]}>
          <IconButton
            onClick={() => setKeepColorRampRange(!keepColorRampRange)}
            type={keepColorRampRange ? "primary" : "link"}
          >
            {keepColorRampRange ? (
              <LockOutlined alt={keepRangeButtonAltText} />
            ) : (
              <UnlockOutlined alt={keepRangeButtonAltText} />
            )}
          </IconButton>
        </Tooltip>
      </FlexRowAlignCenter>
    </Tooltip>
  );
}
