import { CloseOutlined, PaperClipOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React, { ReactElement, useContext, useMemo } from "react";

import { FlexColumn, FlexRow } from "../../../styles/utils";
import { formatQuantityString, renderStringArrayAsJsx } from "../../../utils/formatting";

import { AnnotationParseResult } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import ExpandableList from "../../ExpandableList";
import IconButton from "../../IconButton";
import MessageCard from "../../MessageCard";

type AnnotationFileInfoProps = {
  errorText: string;
  file: File | null;
  parseResult: AnnotationParseResult | null;
  clearFile: () => void;
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
  const { errorText, file: uploadedFile, parseResult } = props;
  const theme = useContext(AppThemeContext);

  const conversionWarnings = useMemo((): string[] => {
    if (!parseResult) {
      return [];
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
    return conversionWarnings;
  }, [parseResult]);

  const getFileInfoContents = (): ReactElement => {
    const hasError = errorText !== "";

    // Show only error message if there was an error
    if (hasError || !parseResult) {
      return (
        <MessageCard type="error">
          <p style={{ color: theme.color.text.error }}>{errorText || "File could not be parsed."}</p>
        </MessageCard>
      );
    }

    const parsedObjects = parseResult.totalRows - parseResult.unparseableRows - parseResult.invalidIds;
    const totalObjects = parseResult.totalRows;
    const parsedObjectsText = formatTotalQuantityString(parsedObjects, totalObjects, "object", "objects");
    const labels = parseResult.annotationData.getLabels();

    return (
      <FlexColumn $gap={6}>
        {conversionWarnings.length > 0 && (
          <MessageCard type="warning">
            <div>
              Some data mismatches were detected in the CSV file. This may indicate that the annotations are from
              another dataset.
              {renderStringArrayAsJsx(conversionWarnings)}
            </div>
          </MessageCard>
        )}
        {parseResult && (
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
        )}
      </FlexColumn>
    );
  };

  return (
    <Card
      size="small"
      title={
        <FlexRow $gap={6}>
          <PaperClipOutlined />
          <b>{uploadedFile?.name}</b>
        </FlexRow>
      }
      extra={
        <IconButton type="text" onClick={props.clearFile}>
          <CloseOutlined />
        </IconButton>
      }
    >
      {getFileInfoContents()}
    </Card>
  );
}
