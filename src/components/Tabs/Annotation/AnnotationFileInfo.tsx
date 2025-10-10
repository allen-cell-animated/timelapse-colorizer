import React, { ReactElement, ReactNode, useContext, useMemo } from "react";

import { AnnotationParseResult } from "src/colorizer/AnnotationData";
import ExpandableList from "src/components/ExpandableList";
import FileInfoCard from "src/components/Inputs/FileInfoCard";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn } from "src/styles/utils";
import { formatQuantityString, renderStringArrayAsJsx } from "src/utils/formatting";

type AnnotationFileInfoProps = {
  file: File | null;
  parseResult: AnnotationParseResult | null;
  clearFile: () => void;
  errorText?: string;
};

function formatTotalQuantityString(quantity: number, total: number, singular: string, plural: string): string {
  if (quantity === total) {
    return formatQuantityString(quantity, singular, plural);
  }
  return `${quantity}/${total} ${total === 1 ? singular : plural}`;
}

/**
 * Displays information about a parsed annotation file.
 * Shows the file name, number of objects parsed, labels, and any warnings about mismatched data.
 */
export default function AnnotationFileInfo(props: AnnotationFileInfoProps): ReactElement {
  const { parseResult } = props;
  const theme = useContext(AppThemeContext);

  const errorText = props.errorText ?? (props.parseResult === null && "File could not be parsed.");

  const conversionWarningText = useMemo((): ReactNode => {
    if (!parseResult) {
      return null;
    }
    const conversionWarnings: string[] = [];
    const { invalidIds, mismatchedTimes, mismatchedTracks, mismatchedLabels, unparseableRows } = parseResult;
    if (invalidIds >= 1) {
      const warningText = formatQuantityString(invalidIds, "object had an ID that is", "objects had IDs that are");
      conversionWarnings.push(`- ${warningText} not in the dataset and could not be parsed.`);
    }
    if (unparseableRows >= 1) {
      const warningText = formatQuantityString(unparseableRows, "object", "objects");
      conversionWarnings.push(`- ${warningText} had non-numeric values in a metadata column and could not be parsed.`);
    }
    const maxMismatchedData = Math.max(mismatchedTimes, mismatchedTracks, mismatchedLabels);
    if (maxMismatchedData >= 1) {
      const warningText = formatQuantityString(
        maxMismatchedData,
        "object had a time, track, or label that does",
        "objects had times, tracks, or labels that do"
      );
      conversionWarnings.push(`- ${warningText} not match the current dataset.`);
    }
    if (conversionWarnings.length === 0) {
      return null;
    } else {
      return (
        <div>
          Some data mismatches were detected in the CSV file. This may indicate that the annotations are from another
          dataset.
          {renderStringArrayAsJsx(conversionWarnings)}
        </div>
      );
    }
  }, [parseResult]);

  const fileInfoContents = useMemo((): ReactNode => {
    if (!parseResult) {
      return null;
    }
    const parsedObjects = parseResult.totalRows - parseResult.unparseableRows - parseResult.invalidIds;
    const totalObjects = parseResult.totalRows;
    const parsedObjectsText = formatTotalQuantityString(parsedObjects, totalObjects, "object", "objects");
    const labels = parseResult.annotationData.getLabels();

    return (
      <FlexColumn>
        <p>
          Annotations were parsed for {parsedObjectsText} with{" "}
          {formatQuantityString(labels.length, "annotation", "annotations")}:
        </p>
        <ExpandableList collapsedHeightPx={66} expandedMaxHeightPx={300} buttonStyle={{ marginLeft: "15px" }}>
          <ol style={{ margin: "0", paddingLeft: "30px" }}>
            {labels.map((label, index) => {
              return (
                <li key={index}>
                  <span>{label.options.name}</span>{" "}
                  <span style={{ color: theme.color.text.hint }}>({label.ids.size})</span>
                </li>
              );
            })}
          </ol>
        </ExpandableList>
      </FlexColumn>
    );
  }, [errorText, parseResult]);

  return (
    <FileInfoCard
      fileName={props.file?.name ?? "Unknown File"}
      errorText={props.errorText}
      warningText={conversionWarningText}
      onClickClear={props.clearFile}
    >
      {fileInfoContents}
    </FileInfoCard>
  );
}
