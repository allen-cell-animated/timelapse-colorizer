import { Tag } from "antd";
import React, { type PropsWithChildren, type ReactElement, useCallback } from "react";
import styled from "styled-components";
import { useShallow } from "zustand/shallow";

import { AnnotationSelectionMode, type PixelIdInfo, VECTOR_KEY_MOTION_DELTA, VectorTooltipMode } from "src/colorizer";
import { LabelType } from "src/colorizer/AnnotationData";
import { formatNumber } from "src/colorizer/utils/math_utils";
import { type AnnotationState } from "src/hooks";
import { selectVectorConfigFromState } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";
import { FlexColumn, FlexRow } from "src/styles/utils";

import HoverTooltip from "./HoverTooltip";

type CanvasHoverTooltipProps = {
  lastValidHoveredId: PixelIdInfo;
  showObjectHoverInfo: boolean;
  annotationState: AnnotationState;
};

const ObjectInfoCard = styled.div`
  font-family: var(--default-font);

  border-radius: var(--radius-control-small);
  border: 1px solid var(--color-dividers);
  background-color: var(--color-background);
  padding: 6px 8px;
  overflow-wrap: break-word;

  transition: opacity 300ms ease-in-out;
  width: fit-content;
`;

const DebugText = styled.p`
  font-size: var(--font-size-label-small) !important;
  color: var(--color-text-hint);
`;

/**
 * Sets up and configures the hover tooltip for the main viewport canvas.
 * By default, displays the track ID and the value of the feature at the hovered point.
 *
 * Additional data will be displayed depending on the current viewer configuration:
 * - If vectors are enabled, the vector value (either magnitude or components) will be displayed.
 */
export default function CanvasHoverTooltip(props: PropsWithChildren<CanvasHoverTooltipProps>): ReactElement {
  const { lastValidHoveredId: lastHoveredId } = props;

  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const motionDeltas = useViewerStateStore((state) => state.vectorMotionDeltas);
  const vectorConfig = useViewerStateStore(useShallow(selectVectorConfigFromState));

  const featureName = featureKey ? dataset?.getFeatureName(featureKey) : undefined;

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
      return formatNumber(featureValue, 3) + unitsLabel;
    },
    [featureKey, dataset]
  );

  const getHoveredFeatureValue = useCallback((): string => {
    if (lastHoveredId.globalId !== undefined && dataset !== null && featureKey !== null) {
      const featureVal = getFeatureValue(lastHoveredId.globalId);
      const categories = dataset.getFeatureCategories(featureKey);
      if (categories !== null) {
        return categories[Number.parseInt(featureVal, 10)];
      } else {
        return featureVal;
      }
    }
    return "N/A";
  }, [lastHoveredId, dataset, getFeatureValue, featureKey]);
  const hoveredFeatureValue = getHoveredFeatureValue();

  const getVectorTooltipText = useCallback((): string | null => {
    if (!vectorConfig.visible || lastHoveredId.globalId === undefined || !motionDeltas) {
      return null;
    }
    const globalId = lastHoveredId.globalId;
    const motionDelta = [motionDeltas[2 * globalId], motionDeltas[2 * globalId + 1]];

    if (Number.isNaN(motionDelta[0]) || Number.isNaN(motionDelta[1])) {
      return null;
    }

    const vectorKey = vectorConfig.key;
    // TODO: If/when support for user vector data is added, this will need to get the vector's
    // display name from the dataset.
    const vectorName = vectorKey === VECTOR_KEY_MOTION_DELTA ? "Avg. motion delta" : vectorKey;
    if (vectorConfig.tooltipMode === VectorTooltipMode.MAGNITUDE) {
      const magnitude = Math.sqrt(motionDelta[0] ** 2 + motionDelta[1] ** 2);
      const angleDegrees = (360 + Math.atan2(-motionDelta[1], motionDelta[0]) * (180 / Math.PI)) % 360;
      const magnitudeText = formatNumber(magnitude, 3);
      const angleText = formatNumber(angleDegrees, 1);
      return `${vectorName}: ${magnitudeText} px, ${angleText}°`;
    } else {
      const showIntegersAsDecimals = !Number.isInteger(motionDelta[0]) || !Number.isInteger(motionDelta[1]);
      const x = formatNumber(motionDelta[0], 3, showIntegersAsDecimals);
      const y = formatNumber(motionDelta[1], 3, showIntegersAsDecimals);
      return `${vectorName}: (${x}, ${y}) px
       `;
    }
  }, [vectorConfig, lastHoveredId, motionDeltas]);
  const vectorTooltipText = getVectorTooltipText();

  const objectInfoContent = [
    <p key="track_id">
      Track ID: {lastHoveredId.globalId !== undefined ? dataset?.getTrackId(lastHoveredId.globalId) : "N/A"}
    </p>,
    <p key="feature_value">
      {featureName ?? "Feature"}: <span style={{ whiteSpace: "nowrap" }}>{hoveredFeatureValue}</span>
    </p>,
    <DebugText key="object_id">Label ID: {lastHoveredId.segId}</DebugText>,
  ];

  if (vectorTooltipText) {
    objectInfoContent.splice(2, 0, <p key="vector">{vectorTooltipText}</p>);
  }

  // Show all current labels applied to the hovered object
  const labelData = props.annotationState.data.getLabels();
  const lastHoveredGlobalId = lastHoveredId.globalId;
  if (lastHoveredGlobalId !== undefined) {
    const labels = props.annotationState.data.getLabelsAppliedToId(lastHoveredGlobalId);
    if (labels.length > 0 && props.annotationState.visible) {
      objectInfoContent.push(
        <div style={{ lineHeight: "28px" }}>
          {labels.map((labelIdx) => {
            const label = labelData[labelIdx];
            const value =
              label.options.type !== LabelType.BOOLEAN
                ? props.annotationState.data.getValueFromId(labelIdx, lastHoveredGlobalId)
                : undefined;
            return (
              // TODO: Tags do not change their text color based on the background color.
              // Make a custom wrapper for Tag that does this; see
              // https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
              <Tag
                key={labelIdx}
                style={{ width: "fit-content", margin: "0 2px" }}
                color={"#" + label.options.color.getHexString()}
              >
                {label.options.name}
                {value ? " - " + value : ""}
              </Tag>
            );
          })}
        </div>
      );
    }
  }

  // If editing annotations, also show the current label being applied
  let annotationLabel: React.ReactNode;
  const currentLabelIdx = props.annotationState.currentLabelIdx;
  if (props.annotationState.isAnnotationModeEnabled && currentLabelIdx !== null) {
    const currentLabelData = labelData[currentLabelIdx];

    let value = null;
    if (currentLabelData.options.type !== LabelType.BOOLEAN) {
      value = props.annotationState.nextDefaultLabelValue;
    }

    annotationLabel = (
      <>
        <Tag
          style={{ width: "fit-content", margin: "0 2px" }}
          color={"#" + currentLabelData.options.color.getHexString()}
        >
          {currentLabelData.options.name}
          {value ? " - " + value : ""}
        </Tag>
      </>
    );

    if (lastHoveredId.globalId !== undefined) {
      const isHoveredIdLabeled = props.annotationState.data.isLabelOnId(currentLabelIdx, lastHoveredId.globalId);
      const isLabelBoolean = currentLabelData.options.type === LabelType.BOOLEAN;
      const verb = isHoveredIdLabeled ? (isLabelBoolean ? "clear" : "edit") : "annotate";
      if (props.annotationState.selectionMode === AnnotationSelectionMode.TRACK) {
        annotationLabel = (
          <FlexRow>
            {annotationLabel}
            <Tag bordered={true} color="gold" style={{ width: "fit-content" }}>
              ✦ Click to {verb} entire track
            </Tag>
          </FlexRow>
        );
      } else if (props.annotationState.selectionMode === AnnotationSelectionMode.RANGE && dataset) {
        if (props.showObjectHoverInfo) {
          const hoveredRange = props.annotationState.getSelectRangeFromId(dataset, lastHoveredId.globalId);
          if (hoveredRange !== null && hoveredRange.length > 1) {
            // Get min and max track IDs
            const id0 = hoveredRange[0];
            const id1 = hoveredRange[hoveredRange.length - 1];
            const t0 = dataset.getTime(id0);
            const t1 = dataset.getTime(id1);
            annotationLabel = (
              <FlexRow>
                {annotationLabel}
                <Tag bordered={true} color="gold" style={{ width: "fit-content" }}>
                  ✦ Click to {verb} {hoveredRange.length} objects from time {t0} to {t1}
                </Tag>
              </FlexRow>
            );
          }
        }
      }
    }
  }

  const tooltipContent = (
    <FlexColumn $gap={6}>
      {annotationLabel}
      <ObjectInfoCard style={{ opacity: props.showObjectHoverInfo ? 1 : 0 }}>{objectInfoContent}</ObjectInfoCard>
    </FlexColumn>
  );

  return <HoverTooltip tooltipContent={tooltipContent}>{props.children}</HoverTooltip>;
}
