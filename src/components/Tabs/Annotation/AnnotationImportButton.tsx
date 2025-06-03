import { UploadOutlined } from "@ant-design/icons";
import { Modal, Radio, Space, Upload, UploadFile } from "antd";
import React, { ReactElement, useContext, useState } from "react";
import styled, { css } from "styled-components";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { FlexColumn } from "../../../styles/utils";

import { AnnotationData, AnnotationMergeMode, AnnotationParseResult } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import TextButton from "../../Buttons/TextButton";
import MessageCard from "../../MessageCard";
import AnnotationFileInfo from "./AnnotationFileInfo";

type AnnotationImportButtonProps = {
  annotationState: AnnotationState;
};

const MultilineRadio = styled(Radio)<{ $expanded?: boolean }>`
  & .ant-radio.ant-wave-target {
    ${(props) => {
      if (props.$expanded) {
        return css`
          margin: 3px 0 auto 0;
        `;
      }
      return css``;
    }}
  }
`;

export default function AnnotationImportButton(props: AnnotationImportButtonProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const { annotationState } = props;
  const theme = useContext(AppThemeContext);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<AnnotationParseResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [mergeMode, setMergeMode] = useState(AnnotationMergeMode.APPEND);

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const handleFileUpload = (file: File): void => {
    setUploadedFile(null);
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
        const result = AnnotationData.fromCsv(dataset, text);
        setParseResult(result);
      } catch (error) {
        setErrorText('Could not parse CSV file. Parsing failed with the following error: "' + error + '"');
        console.error("Error parsing CSV file:", error);
      }
      setUploadedFile(file);
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
      annotationState.importData(parseResult.annotationData, mergeMode);
      setShowModal(false);
      setParseResult(null);
      setUploadedFile(null);
      setErrorText("");
      annotationState.setVisibility(true);
    }
  };

  const hasExistingAnnotationData = annotationState.data.getLabels().length > 0;

  const handleFileChange = (info: { fileList: UploadFile[] }): void => {
    if (info.fileList.length === 0) {
      // File was removed. Clear the state.
      setUploadedFile(null);
      setParseResult(null);
      setErrorText("");
    }
  };

  //// Rendering ////

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
            <AnnotationFileInfo
              errorText={errorText}
              file={uploadedFile}
              parseResult={parseResult}
              clearFile={() => {
                setUploadedFile(null);
                setParseResult(null);
                setErrorText("");
              }}
            ></AnnotationFileInfo>
          ) : (
            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".csv"
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
          {parseResult && hasExistingAnnotationData && (
            <MessageCard type="info">
              <FlexColumn>
                <span style={{ marginBottom: 5 }}>
                  You have existing annotations. How would you like to handle the imported annotations?
                </span>
                <Radio.Group value={mergeMode} onChange={(e) => setMergeMode(e.target.value)}>
                  <Space direction="vertical">
                    <Radio value={AnnotationMergeMode.APPEND}>Append as new annotations</Radio>
                    <MultilineRadio
                      value={AnnotationMergeMode.MERGE}
                      $expanded={mergeMode === AnnotationMergeMode.MERGE}
                    >
                      {mergeMode === AnnotationMergeMode.MERGE ? (
                        <FlexColumn>
                          <p style={{ margin: 0 }}>Merge matching annotations</p>
                          <p style={{ margin: 0 }}>
                            Matching labels will be merged, all other labels will be appended. If there are conflicts
                            where the same object is annotated with different values, the imported CSV takes priority.
                          </p>
                        </FlexColumn>
                      ) : (
                        <>Merge matching annotations</>
                      )}
                    </MultilineRadio>
                    <Radio value={AnnotationMergeMode.OVERWRITE}>Replace all existing annotations</Radio>
                  </Space>
                </Radio.Group>
              </FlexColumn>
            </MessageCard>
          )}
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
