import { DeleteOutlined, PaperClipOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React, { ReactElement, useContext } from "react";

import { FlexColumn, FlexRow } from "../../../styles/utils";
import { renderStringArrayAsJsx } from "../../../utils/formatting";

import { AnnotationParseResult } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import IconButton from "../../IconButton";
import MessageCard from "../../MessageCard";

type AnnotationFileInfoProps = {
  errorText: string;
  file: File | null;
  parseResult: AnnotationParseResult | null;
  clearFile: () => void;
};

export default function AnnotationFileInfo(props: AnnotationFileInfoProps): ReactElement {
  const { errorText, file: uploadedFile, parseResult } = props;
  const theme = useContext(AppThemeContext);

  const conversionWarnings = [];
  if (parseResult) {
    const { invalidIds, mismatchedTimes, mismatchedTracks, unparseableRows } = parseResult;
    if (invalidIds === 1) {
      conversionWarnings.push(`- ${invalidIds} object had an ID that is not in the dataset and could not be parsed.`);
    } else if (invalidIds > 1) {
      conversionWarnings.push(`- ${invalidIds} objects had IDs that are not in the dataset and could not be parsed.`);
    }
    if (unparseableRows === 1) {
      conversionWarnings.push(
        `- ${unparseableRows} object had non-numeric values in a metadata column and could not be parsed.`
      );
    } else if (unparseableRows > 1) {
      conversionWarnings.push(
        `- ${unparseableRows} objects had non-numeric values in a metadata column and could not be parsed.`
      );
    }
    const maxMismatchedData = Math.max(mismatchedTimes, mismatchedTracks);
    if (maxMismatchedData === 1) {
      conversionWarnings.push(
        `- ${maxMismatchedData} object had a time or track that does not match the current dataset.`
      );
    } else if (maxMismatchedData > 1) {
      conversionWarnings.push(
        `- ${maxMismatchedData} objects had times or tracks that do not match the current dataset.`
      );
    }
  }

  const hasError = errorText !== "";
  const parsedObjects = parseResult ? parseResult.totalRows - parseResult.unparseableRows - parseResult.invalidIds : 0;
  const totalObjects = parseResult ? parseResult.totalRows : 0;
  const parsedObjectsText = parsedObjects === totalObjects ? parsedObjects : `${parsedObjects}/${totalObjects}`;
  const fileInfoContents = hasError ? (
    <MessageCard type="error">
      <p style={{ color: theme.color.text.error }}>{errorText}</p>
    </MessageCard>
  ) : (
    <>
      {conversionWarnings.length > 0 && (
        <MessageCard type="warning">
          <div>
            Some data mismatches were detected in the CSV file. This may indicate that the annotations are from another
            dataset.
            {renderStringArrayAsJsx(conversionWarnings)}
          </div>
        </MessageCard>
      )}
      {parseResult && (
        <>
          <p>Annotations were parsed for {parsedObjectsText} objects.</p>
          <ul style={{ margin: "5px 0", paddingLeft: "30px" }}>
            <li></li>
            <li>{parseResult?.annotationData.getLabels().length} labels</li>
          </ul>
        </>
      )}
    </>
  );

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
          <DeleteOutlined />
        </IconButton>
      }
      style={{ margin: "0px 20px" }}
    >
      <FlexColumn $gap={6}>{fileInfoContents}</FlexColumn>
    </Card>
  );
}
