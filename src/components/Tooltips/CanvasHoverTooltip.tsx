import React, { PropsWithChildren, ReactElement, useCallback } from "react";

import { Dataset, VECTOR_KEY_MOTION_DELTA, VectorTooltipMode, ViewerConfig } from "../../colorizer";
import { numberToStringDecimal } from "../../colorizer/utils/math_utils";

import HoverTooltip from "./HoverTooltip";

type CanvasHoverTooltipProps = {
  dataset: Dataset | null;
  featureKey: string;
  lastHoveredId: number | null;
  showHoveredId: boolean;
  motionDeltas: Float32Array | null;
  config: ViewerConfig;
};

/**
 * Sets up and configures the hover tooltip for the main viewport canvas.
 * By default, displays the track ID and the value of the feature at the hovered point.
 *
 * Additional data will be displayed depending on the current viewer configuration:
 * - If vectors are enabled, the vector value (either magnitude or components) will be displayed.
 */
export default function CanvasHoverTooltip(props: PropsWithChildren<CanvasHoverTooltipProps>): ReactElement {
  const { dataset, featureKey, lastHoveredId, motionDeltas, config } = props;

  const getFeatureValue = useCallback(
    (id: number): string => {
      if (!featureKey || !dataset) {
        return "";
      }
      // Look up feature value from id
      const featureData = dataset.getFeatureData(featureKey);
      // ?? is a nullish coalescing operator; it checks for null + undefined values
      // (safe for falsy values like 0 or NaN, which are valid feature values)
      let featureValue = featureData?.data[id] ?? -1;
      featureValue = isFinite(featureValue) ? featureValue : NaN;
      const unitsLabel = featureData?.unit ? ` ${featureData?.unit}` : "";
      // Check if int, otherwise return float
      return numberToStringDecimal(featureValue, 3) + unitsLabel;
    },
    [featureKey, dataset]
  );

  let hoveredFeatureValue = "";
  if (lastHoveredId !== null && dataset) {
    const featureVal = getFeatureValue(lastHoveredId);
    const categories = dataset.getFeatureCategories(featureKey);
    if (categories !== null) {
      hoveredFeatureValue = categories[Number.parseInt(featureVal, 10)];
    } else {
      hoveredFeatureValue = featureVal;
    }
  }

  const getVectorTooltipText = (): string | null => {
    if (!config.vectorConfig.visible || lastHoveredId === null || !motionDeltas) {
      return null;
    }
    const motionDelta = [motionDeltas[2 * lastHoveredId], motionDeltas[2 * lastHoveredId + 1]];

    if (Number.isNaN(motionDelta[0]) || Number.isNaN(motionDelta[1])) {
      return null;
    }

    const vectorKey = config.vectorConfig.key;
    const vectorName = vectorKey === VECTOR_KEY_MOTION_DELTA ? "Avg. motion delta" : vectorKey;
    if (config.vectorConfig.tooltipMode === VectorTooltipMode.MAGNITUDE) {
      const magnitude = Math.sqrt(motionDelta[0] ** 2 + motionDelta[1] ** 2);
      const angleDegrees = (360 + Math.atan2(-motionDelta[1], motionDelta[0]) * (180 / Math.PI)) % 360;
      const magnitudeText = numberToStringDecimal(magnitude, 3);
      const angleText = numberToStringDecimal(angleDegrees, 1);
      return `${vectorName}: ${magnitudeText} px, ${angleText}°`;
    } else {
      const allowIntegerTruncation = Number.isInteger(motionDelta[0]) && Number.isInteger(motionDelta[1]);
      const x = numberToStringDecimal(motionDelta[0], 3, allowIntegerTruncation);
      const y = numberToStringDecimal(motionDelta[1], 3, allowIntegerTruncation);
      return `${vectorName}: (${x}, ${y}) px
       `;
    }
  };

  const vectorTooltipText = getVectorTooltipText();
  const hoverTooltipContent = [
    <p key="track_id">Track ID: {lastHoveredId && dataset?.getTrackId(lastHoveredId)}</p>,
    <p key="feature_value">
      {dataset?.getFeatureName(featureKey) || "Feature"}:{" "}
      <span style={{ whiteSpace: "nowrap" }}>{hoveredFeatureValue}</span>
    </p>,
    vectorTooltipText ? <p key="vector">{vectorTooltipText}</p> : null,
  ];

  return (
    <HoverTooltip tooltipContent={hoverTooltipContent} disabled={!props.showHoveredId}>
      {props.children}
    </HoverTooltip>
  );
}
