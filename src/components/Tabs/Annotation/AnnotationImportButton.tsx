import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  PaperClipOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Card, Modal, Upload, UploadFile } from "antd";
import React, { ReactElement, useContext, useMemo, useState } from "react";
import styled from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { FlexColumn, FlexRow } from "../../../styles/utils";
import { renderStringArrayAsJsx } from "../../../utils/formatting";

import { AnnotationData, AnnotationParseResult } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import TextButton from "../../Buttons/TextButton";
import IconButton from "../../IconButton";

type AnnotationImportButtonProps = {
  annotationState: AnnotationState;
};

const WarningStyleCard = styled(Card)`
  border-color: var(--color-alert-warning-border);
  background-color: var(--color-alert-warning-fill);
`;

const WarningCard = (props: React.PropsWithChildren): ReactElement => {
  return (
    <WarningStyleCard size="small">
      <FlexRow $gap={10}>
        <div>
          <WarningOutlined style={{ color: "var(--color-text-warning)", fontSize: "var(--font-size-label)" }} />
        </div>
        {props.children}
      </FlexRow>
    </WarningStyleCard>
  );
};

// TODO: Make shared styled component?
const ErrorStyleCard = styled(Card)`
  border-color: var(--color-alert-error-border);
  background-color: var(--color-alert-error-fill);
`;

const ErrorCard = (props: React.PropsWithChildren): ReactElement => {
  return (
    <ErrorStyleCard size="small">
      <FlexRow $gap={10}>
        <div>
          <ExclamationCircleOutlined style={{ color: "var(--color-text-error)", fontSize: "var(--font-size-label)" }} />
        </div>
        {props.children}
      </FlexRow>
    </ErrorStyleCard>
  );
};

export default function AnnotationImportButton(props: AnnotationImportButtonProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const { annotationState } = props;
  const theme = useContext(AppThemeContext);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<AnnotationParseResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [errorText, setErrorText] = useState("");

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const handleFileUpload = async (file: File): Promise<void> => {
    setUploadedFile(file);
    setParseResult(null);
    setErrorText("");
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCsv || !dataset) {
      setErrorText("Only CSV files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        // TODO: Do this in a worker to avoid blocking the UI thread?
        const result = await AnnotationData.fromCsv(dataset, text);
        setParseResult(result);
      } catch (error) {
        setErrorText('Could not parse CSV file. Parsing failed with the following error: "' + error + '"');
        console.error("Error parsing CSV file:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleCancel = (): void => {
    setShowModal(false);
    setParseResult(null);
    setUploadedFile(null);
    setErrorText("");
  };

  const handleImport = async (): Promise<void> => {
    if (parseResult) {
      // TODO: give more advanced merging options here. There are three possible
      // options:
      // 1. Overwrite existing annotations (default, current behavior)
      // 2. Keep both (no merging, labels are kept separate even if they have
      //    matching names)
      // 3. Merge annotations (merge matching labels with the same types. Users
      //    should be given an option for how to handle when conflicts occur for
      //    values (e.g. the imported CSV has a different value assigned to the
      //    same ID))
      annotationState.replaceAnnotationData(parseResult.annotationData);
      setShowModal(false);
      setParseResult(null);
      setUploadedFile(null);
      setErrorText("");
      annotationState.setVisibility(true);
    }
  };

  const hasAnnotationData = annotationState.data.getLabels().length > 0;
  const conversionWarnings = [];
  if (parseResult) {
    const { invalidIds, mismatchedTimes, mismatchedTracks, unparseableRows } = parseResult;
    if (invalidIds === 1) {
      conversionWarnings.push(`- ${invalidIds} object had an ID that is not in the dataset.`);
    } else if (invalidIds > 1) {
      conversionWarnings.push(`- ${invalidIds} objects had IDs that are not in the dataset.`);
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
    if (unparseableRows === 1) {
      conversionWarnings.push(`- ${unparseableRows} object could not be parsed.`);
    } else if (unparseableRows > 1) {
      conversionWarnings.push(`- ${unparseableRows} objects could not be parsed.`);
    }
  }

  const handleFileChange = (info: { fileList: UploadFile[] }): void => {
    if (info.fileList.length === 0) {
      // File was removed. Clear the state.
      setUploadedFile(null);
      setParseResult(null);
      setErrorText("");
    }
  };

  //// Rendering ////

  const fileList: UploadFile[] = useMemo(() => {
    if (!uploadedFile) {
      return [];
    }
    return [
      {
        uid: "",
        name: uploadedFile.name,
        status: parseResult?.annotationData !== null ? "done" : "error",
      },
    ];
  }, [uploadedFile, parseResult]);

  const fileDeleteButton = (
    <IconButton
      type="text"
      onClick={() => {
        setUploadedFile(null);
        setParseResult(null);
        setErrorText("");
      }}
    >
      <DeleteOutlined />
    </IconButton>
  );

  const fileInfoTitle = (
    <FlexRow $gap={6}>
      <PaperClipOutlined />
      <b>{uploadedFile?.name}</b>
    </FlexRow>
  );

  const hasError = errorText !== "";
  const fileInfoContents = hasError ? (
    <ErrorCard>
      <p style={{ color: theme.color.text.error }}>{errorText}</p>
    </ErrorCard>
  ) : (
    <>
      {conversionWarnings.length > 0 && (
        <WarningCard>
          <div>
            Some data mismatches were detected in the CSV file. This may indicate that the annotations are from another
            dataset.
            {renderStringArrayAsJsx(conversionWarnings)}
          </div>
        </WarningCard>
      )}
      <ul style={{ margin: "5px 0", paddingLeft: "30px" }}>
        <li>{parseResult?.totalRows || 0} annotated objects</li>
        <li>{parseResult?.annotationData.getLabels().length} labels</li>
      </ul>
    </>
  );

  const fileInfoCard = (
    <Card size="small" title={fileInfoTitle} extra={fileDeleteButton} style={{ margin: "0px 20px" }}>
      <FlexColumn $gap={6}>{fileInfoContents}</FlexColumn>
    </Card>
  );

  return (
    <div ref={modalContainerRef}>
      <Modal
        getContainer={() => modalContainerRef.current!}
        title="Import CSV"
        open={showModal}
        okText="Import"
        okButtonProps={{ disabled: !parseResult }}
        onOk={handleImport}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <FlexColumn $gap={6}>
          {uploadedFile ? (
            fileInfoCard
          ) : (
            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".csv"
              fileList={fileList}
              onChange={handleFileChange}
              showUploadList={true}
              beforeUpload={handleFileUpload}
            >
              <>
                <span style={{ color: theme.color.text.hint, fontSize: theme.font.size.header }}>
                  <UploadOutlined />
                </span>
                <p style={{ color: theme.color.text.hint }}>Click or drag a .csv file to this area to upload</p>
              </>
            </Upload.Dragger>
          )}
          {parseResult && (
            <FlexColumn $gap={6}>
              {parseResult && hasAnnotationData && (
                <p style={{ color: theme.color.text.warning }}>
                  <WarningCard>
                    <FlexRow $gap={10}>Existing annotations will be overwritten during import.</FlexRow>
                  </WarningCard>
                </p>
              )}
            </FlexColumn>
          )}
          {/* <SettingsContainer>
            <SettingsItem label="Conflict resolution">
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="append">
                    <FlexColumn>
                      <p>Append labels</p>
                      <p style={{ marginTop: 0 }}>Some additional context</p>
                    </FlexColumn>
                  </Radio>
                  <Radio value="merge">Merge matching labels</Radio>
                  <Radio value="">Overwrite existing annotations</Radio>
                </Space>
              </Radio.Group>
            </SettingsItem>
          </SettingsContainer> */}
        </FlexColumn>
      </Modal>
      <TextButton
        onClick={() => {
          setShowModal(!showModal);
        }}
        disabled={dataset === null}
      >
        Import CSV
      </TextButton>
    </div>
  );
}
